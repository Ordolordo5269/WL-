import type { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../../db/client';

// ─── In-memory TLE cache (2-hour TTL per CelesTrak guidelines) ──────
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const VALID_GROUPS = new Set(['starlink', 'military', 'navigation', 'weather', 'stations', 'active', 'gps-ops', 'geo']);

// Composite groups: merge multiple CelesTrak groups into one response
const COMPOSITE_GROUPS: Record<string, string[]> = {
  military:   ['military', 'molniya'],      // defense/intel + Russian military comms
  navigation: ['gnss'],                     // GPS, GLONASS, BeiDou, Galileo, IRNSS, QZSS
  weather:    ['weather', 'sarsat'],        // meteorological + search-and-rescue
  stations:   ['stations', 'tdrss'],        // space stations (ISS, CSS) + NASA relay
};

// Country inference from satellite name patterns
const COUNTRY_PATTERNS: [RegExp, string][] = [
  [/^USA[ -]|^DMSP|^GPS |^GPS-|^GPS ?B|^NAVSTAR|^WGS|^AEHF|^SBIRS|^GSSAP|^MUOS|^NOSS|^DSP|^MILSTAR|^GOES|^NOAA|^SUOMI|^JPSS|^CYGFM|^EWS-G|^TDRS|^TERRA$|^AQUA$|^AURA$|^SWIFT$|^GPM|^MMS |^FGRST|^TIMED$|^SORCE$|^THEMIS/i, 'US'],
  [/^STARLINK/i, 'US'],
  [/^ISS |^PROGRESS|^SOYUZ|^NAUKA/i, 'RU'],
  [/^KOSMOS|^COSMOS|^METEOR-M|^GLONASS|^ELEKTRO|^ARKTIKA|^LUCH|^RAZDAN|^BARS-M|^LOTOS|^PION|^MOLNIYA|^MERIDIAN|^RADUGA/i, 'RU'],
  [/^FENGYUN|^FY-|^TIANMU|^COMS|^GK-|^BEIDOU|^SHIJIAN|^YAOGAN|^GAOFEN|^JILIN/i, 'CN'],
  [/^CSS |^TIANHE|^WENTIAN|^MENGTIAN|^TIANZHOU|^SHENZHOU/i, 'CN'],
  [/^METEOSAT|^METOP|^GALILEO|^GSAT01|^GSAT02|^GSAT03|^EGNOS/i, 'EU'],
  [/^HIMAWARI|^QZSS|^MICHIBIKI/i, 'JP'],
  [/^INSAT|^IRNSS|^GSAT(?!0)|^CARTOSAT|^OCEANSAT|^GAGAN/i, 'IN'],
  [/^SAPPHIRE/i, 'CA'],
  [/^PRAETORIAN|^CREW DRAGON|^HST$|^HTV/i, 'US'],
  [/^OFEK|^EROS/i, 'IL'],
  [/^SAR-LUPE|^SARAH/i, 'DE'],
  [/^HELIOS|^CSO-|^PLEIADES/i, 'FR'],
  [/^SKYNET|^SENTINEL/i, 'GB'],
  [/^KOMPSAT|^ANASIS/i, 'KR'],
];

function inferCountry(name: string): string {
  for (const [pattern, country] of COUNTRY_PATTERNS) {
    if (pattern.test(name)) return country;
  }
  return '';
}

interface CachedTLE {
  data: unknown[];
  expiresAt: number;
}

const tleCache = new Map<string, CachedTLE>();

// ─── OMM JSON → TLE line conversion ────────────────────────────────
// CelesTrak FORMAT=json returns OMM parameters without TLE_LINE1/TLE_LINE2.
// satellite.js v5 requires actual TLE text, so we synthesize it server-side.

function ommToTLELines(omm: any): { TLE_LINE1: string; TLE_LINE2: string } | null {
  try {
    const norad = omm.NORAD_CAT_ID ?? 0;
    const classification = (omm.CLASSIFICATION_TYPE || 'U')[0];
    const intlDes = formatIntlDesignator(omm.OBJECT_ID || '');
    const epoch = ommEpochToTLE(omm.EPOCH || '');
    if (!epoch) return null;

    const ndot = fmtNdot(omm.MEAN_MOTION_DOT ?? 0);
    const nddot = fmtExpField(omm.MEAN_MOTION_DDOT ?? 0);
    const bstar = fmtExpField(omm.BSTAR ?? 0);
    const ephType = omm.EPHEMERIS_TYPE ?? 0;
    const elSetNo = String(omm.ELEMENT_SET_NO ?? 999);

    // TLE Line 1: 69 chars
    //  Col  1     : Line number
    //  Col  3-7   : NORAD catalog number
    //  Col  8     : Classification
    //  Col 10-17  : International designator
    //  Col 19-32  : Epoch (YYDDD.DDDDDDDD)
    //  Col 34-43  : 1st deriv of mean motion
    //  Col 45-52  : 2nd deriv of mean motion
    //  Col 54-61  : BSTAR drag term
    //  Col 63     : Ephemeris type
    //  Col 65-68  : Element set number
    //  Col 69     : Checksum
    let l1 = '1 ';
    l1 += rpad(String(norad), 5) + classification + ' ';
    l1 += rpad(intlDes, 8) + ' ';
    l1 += epoch + ' ';
    l1 += ndot + ' ';
    l1 += nddot + ' ';
    l1 += bstar + ' ';
    l1 += String(ephType) + ' ';
    l1 += lpad(elSetNo, 4);
    l1 = rpad(l1, 68);
    l1 += checksumTLE(l1);

    // TLE Line 2
    const inc = lpad(Number(omm.INCLINATION).toFixed(4), 8);
    const raan = lpad(Number(omm.RA_OF_ASC_NODE).toFixed(4), 8);
    const ecc = Number(omm.ECCENTRICITY).toFixed(7).replace('0.', '');
    const argp = lpad(Number(omm.ARG_OF_PERICENTER).toFixed(4), 8);
    const ma = lpad(Number(omm.MEAN_ANOMALY).toFixed(4), 8);
    const mm = lpad(Number(omm.MEAN_MOTION).toFixed(8), 11);
    const rev = lpad(String(omm.REV_AT_EPOCH ?? 0), 5);

    let l2 = '2 ';
    l2 += rpad(String(norad), 5) + ' ';
    l2 += inc + ' ';
    l2 += raan + ' ';
    l2 += ecc + ' ';
    l2 += argp + ' ';
    l2 += ma + ' ';
    l2 += mm + rev;
    l2 = rpad(l2, 68);
    l2 += checksumTLE(l2);

    return { TLE_LINE1: l1, TLE_LINE2: l2 };
  } catch {
    return null;
  }
}

function formatIntlDesignator(objectId: string): string {
  const m = objectId.match(/^(\d{4})-(\d+)([A-Za-z]*)$/);
  if (!m) return '        ';
  return m[1].slice(2) + m[2].padStart(3, '0') + (m[3] || '').toUpperCase().padEnd(3, ' ');
}

function ommEpochToTLE(isoStr: string): string | null {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear() % 100;
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  const dayOfYear = (d.getTime() - jan1) / 86400000 + 1;
  // Format: YYDDD.DDDDDDDD (14 chars total: 2-digit year + 3-digit day + . + 8 decimals)
  const dayInt = Math.floor(dayOfYear);
  const dayFrac = (dayOfYear - dayInt).toFixed(8).slice(1); // ".DDDDDDDD"
  return String(year).padStart(2, '0') + String(dayInt).padStart(3, '0') + dayFrac;
}

function fmtNdot(val: number): string {
  const sign = val < 0 ? '-' : ' ';
  const s = Math.abs(val).toFixed(8).replace('0.', '.');
  return sign + s;
}

function fmtExpField(val: number): string {
  // TLE exponential format: ±DDDDD±E where value = 0.DDDDD × 10^E
  if (val === 0) return ' 00000-0';
  const sign = val < 0 ? '-' : ' ';
  const abs = Math.abs(val);
  // Find exponent such that 0.1 <= mantissa < 1.0
  const exp = Math.floor(Math.log10(abs)) + 1;
  const mantissa = abs / Math.pow(10, exp);  // 0.1 <= mantissa < 1.0
  const mantissaStr = String(Math.round(mantissa * 100000)).padStart(5, '0');
  const expSign = exp >= 0 ? '+' : '-';
  return sign + mantissaStr + expSign + String(Math.abs(exp));
}

function checksumTLE(line: string): string {
  let sum = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c >= '0' && c <= '9') sum += parseInt(c);
    else if (c === '-') sum += 1;
  }
  return String(sum % 10);
}

function lpad(s: string, n: number, ch = ' '): string {
  while (s.length < n) s = ch + s;
  return s;
}

function rpad(s: string, n: number, ch = ' '): string {
  while (s.length < n) s += ch;
  return s;
}

// ─── Controller ─────────────────────────────────────────────────────
export async function getSatelliteTLE(req: Request, res: Response) {
  const group = (req.query.group as string || '').toLowerCase();

  if (!group || !VALID_GROUPS.has(group)) {
    res.status(400).json({
      error: `Invalid group. Valid: ${[...VALID_GROUPS].join(', ')}`,
    });
    return;
  }

  // Check cache
  const cached = tleCache.get(group);
  if (cached && cached.expiresAt > Date.now()) {
    res.set('Cache-Control', 'public, max-age=7200, stale-while-revalidate=3600');
    res.set('X-Cache', 'HIT');
    res.json(cached.data);
    return;
  }

  // Determine which CelesTrak groups to fetch (may be composite)
  const groupsToFetch = COMPOSITE_GROUPS[group] || [group];

  try {
    // Fetch all sub-groups in parallel
    const responses = await Promise.all(
      groupsToFetch.map(g =>
        axios.get(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=json`, {
          timeout: 30_000,
          headers: { 'Accept': 'application/json' },
        })
      )
    );

    // Merge and deduplicate by NORAD_CAT_ID
    const seen = new Set<number>();
    const allOmm: any[] = [];
    for (const response of responses) {
      const arr = Array.isArray(response.data) ? response.data : [];
      for (const omm of arr) {
        const id = omm.NORAD_CAT_ID;
        if (id && !seen.has(id)) {
          seen.add(id);
          allOmm.push(omm);
        }
      }
    }

    // Enrich each OMM entry with synthesized TLE lines + country
    const data = allOmm
      .map((omm: any) => {
        const tle = ommToTLELines(omm);
        if (!tle) return null;
        return {
          OBJECT_NAME: omm.OBJECT_NAME || 'UNKNOWN',
          NORAD_CAT_ID: omm.NORAD_CAT_ID || 0,
          OBJECT_ID: omm.OBJECT_ID || '',
          COUNTRY: inferCountry(omm.OBJECT_NAME || ''),
          TLE_LINE1: tle.TLE_LINE1,
          TLE_LINE2: tle.TLE_LINE2,
        };
      })
      .filter(Boolean);

    tleCache.set(group, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    res.set('Cache-Control', 'public, max-age=7200, stale-while-revalidate=3600');
    res.set('X-Cache', 'MISS');
    res.json(data);
  } catch (err: any) {
    // Serve stale cache if CelesTrak is down
    if (cached) {
      res.set('X-Cache', 'STALE');
      res.json(cached.data);
      return;
    }
    console.error('[satellite/tle] CelesTrak proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch TLE data from CelesTrak' });
  }
}

// ─── Satellite Profiles ─────────────────────────────────────────────
// Returns all profiles for client-side regex lookup (cached 1h)
let profilesCache: { data: any[]; expiresAt: number } | null = null;

export async function getSatelliteProfiles(_req: Request, res: Response) {
  if (profilesCache && profilesCache.expiresAt > Date.now()) {
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Cache', 'HIT');
    res.json({ data: profilesCache.data });
    return;
  }

  try {
    const profiles = await prisma.satelliteProfile.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    profilesCache = { data: profiles, expiresAt: Date.now() + 3600_000 };
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Cache', 'MISS');
    res.json({ data: profiles });
  } catch (err: any) {
    console.error('[satellite/profiles] DB error:', err.message);
    res.status(500).json({ error: 'Failed to fetch satellite profiles' });
  }
}
