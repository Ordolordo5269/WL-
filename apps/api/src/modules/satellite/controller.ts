import type { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../../db/client';

// ─── In-memory TLE cache (2-hour TTL per CelesTrak guidelines) ──────
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — TLE data changes slowly
const VALID_GROUPS = new Set(['starlink', 'military', 'navigation', 'weather', 'stations', 'active', 'gps-ops', 'geo', 'classified']);

// Composite groups: merge multiple CelesTrak groups into one response
const COMPOSITE_GROUPS: Record<string, string[]> = {
  military:   [
    'military',   // PRAETORIAN (SDA), SAPPHIRE
    'geo',        // USA-*, WGS, SBIRS, MUOS, AEHF, SKYNET, SYRACUSE, UFO, etc.
    'resource',   // YAOGAN, GAOFEN (Chinese ISR)
    'visual',     // COSMOS (RU mil), HELIOS, SHIJIAN
    'musson',     // COSMOS (RU meteorological-mil)
    'gnss',       // COSMOS/GLONASS mil-adjacent, LUCH relay
    'science',    // SHIJIAN experimental mil
    'geodetic',   // COSMOS (geodetic mil)
    'weather',    // DMSP (DoD weather)
    'sarsat',     // COSMOS (SAR), LUCH relay
  ],
  classified: ['analyst'],                    // ~495 classified objects tracked by amateur observers
  navigation: ['gnss'],                     // GPS, GLONASS, BeiDou, Galileo, IRNSS, QZSS
  weather:    ['weather'],                  // meteorological only (sarsat removed — contains GPS/GLONASS/Galileo nav sats)
  stations:   ['stations', 'tdrss'],        // space stations (ISS, CSS) + NASA relay
};

// Supplemental NAME-based fetches for satellites not in any CelesTrak GROUP
const SUPPLEMENTAL_NAME_FETCHES: Record<string, string[]> = {
  military: [
    'MERIDIAN',       // Russia — HEO military comms
    'XTAR',           // Spain/USA — NATO X-band comms
    'EROS',           // Israel — reconnaissance
    'GOKTURK',        // Turkey — reconnaissance
    'KONDOR-FKA',     // Russia — SAR radar military
    'GSAT-7',         // India — military comms
    'CMS-03',         // India — military comms (GSAT-7R)
    'ATHENA-FIDUS',   // France/Italy — military comms
    'FALCON EYE',     // UAE — reconnaissance
    'PAZ',            // Spain — SAR radar military
    'COSMO-SKYMED',   // Italy — SAR radar constellation
    'CSG',            // Italy — COSMO-SkyMed 2nd gen
    'PLEIADES NEO',   // France — high-res reconnaissance
    'RISAT',          // India — SAR radar (military)
    'CARTOSAT',       // India — optical reconnaissance
    'EGYPTSAT',       // Egypt — observation/military
  ],
  stations: ['ETALON'],
  weather: ['ELEKTRO-L'],  // Elektro-L 3/4/5 not in CelesTrak weather group
};

// For groups shared with military that contain non-military sats, filter by name pattern
const MILITARY_NAME_FILTER = /^(USA[-\s]|WGS|MUOS|SBIRS|GSSAP|NOSS|DMSP|DSP\s|AEHF|MILSTAR|NROL|TRUMPET|SDS\s|FLTSATCOM|UFO[\s-]|DSCS|SKYNET|ANASIS|SYRACUSE|SICRAL|XTAR|CSO[-\s]|BARS|LOTOS|PION|RAZDAN|LUCH|MERIDIAN|RADUGA|YAOGAN|GAOFEN|SHIJIAN|KOSMOS|COSMOS|COSMO-SKYMED|CSG|SAR[\s-]LUPE|SARAH|HELIOS|OFEK|SAPPHIRE|PRAETORIAN|MOLNIYA|COMSATBW|KOMPSAT|ARIRANG)/i;
// Groups where ALL satellites are military (no filtering needed)
const MILITARY_UNFILTERED_GROUPS = new Set(['military']);

// Known inactive/retired NORAD IDs to exclude from navigation overlay
const NAVIGATION_EXCLUDED_NORADS = new Set([
  // IRNSS-1A (39199) — primary atomic clocks all failed Mar 2017; replaced by IRNSS-1I
  // Not providing navigation service; kept in orbit but not part of active NavIC constellation
  39199,
  // GPS SVN 49 / PRN 01 (32711) — anomaly during testing, never entered service, decommissioned 2012
  32711,
]);

// Known inactive/retired NORAD IDs to exclude from military overlay
const MILITARY_EXCLUDED_NORADS = new Set([
  // DSP (replaced by SBIRS)
  26356, 26880, 28158,
  // MILSTAR-1 (replaced by AEHF)
  22988, 23712,
  // FLTSATCOM 8 (retired 1990s)
  20253,
  // UFO 2, UFO 4 (retired, exceeded design life)
  22787, 23467,
  // SKYNET 4C (retired, 1990)
  20776,
  // HELIOS 1B (decommissioned ~2012, replaced by CSO)
  25977,
  // RADUGA-1M 3 (exceeded design life)
  39375,
  // SHIJIAN-6 02A/B (end-of-life, 2004)
  29505, 29506,
  // COSMOS 2058/2084/2151 (1990-1991, dead Soviet-era satellites)
  20465, 20663, 21422,
  // ETALON 1/2 (passive geodetic reflectors, moved to stations)
  19751, 20026,
  // COSMOS Parus navigation (design life 2 years, all dead)
  22219, 22236, 22286, 23087, 25590, // 2219, 2221, 2228, 2278, 2361 (1992-1998)
  26818, 27436, 28380,               // 2378, 2389, 2407 (2001-2004)
  // COSMOS Musson geodetic/calibration (1993, dead)
  22626, // 2242
  // COSMOS Oko early warning (replaced by EKS/Tundra, all dead)
  27818, 28521, 31792, 32052, 35635, // 2398, 2414, 2428, 2429, 2454 (2003-2009)
  // COSMOS GLONASS-M 719-723 (2007-2008, withdrawn from constellation)
  32276, 32275, 32393, 32395, // 2432, 2433, 2434, 2436
  // RISAT-1 (2012, design life 5 years, dead)
  38248,
  // CARTOSAT-1 (2005, dead), 2A (2008, dead), 2B (2010, likely dead)
  28649, 32783, 36795,
  // EGYPTSAT-1 (2007, failed 2010), EGYPTSAT-2 (2014, lost contact 2015)
  31117, 39678,
  // GEO dead — high inclination drift (>8°), no station-keeping, confirmed retired
  25019,  // USA 134 (1998, NRO classified, inc 12.7°)
  26575,  // USA 153 (1999, NRO classified, inc 11.5°)
  26715,  // USA 157 / MILSTAR-2 2 (2001, replaced by AEHF, inc 11.5°)
  27168,  // USA 164 / MILSTAR-2 3 (2002, replaced by AEHF, inc 11.1°)
  27691,  // USA 167 (2003, NRO classified, inc 10.8°)
  27711,  // USA 169 / MILSTAR-2 4 (2003, replaced by AEHF, inc 12.2°)
  27875,  // USA 170 (2003, NRO classified, inc 10.3°)
  25967,  // UFO 10 / USA 146 (1999, replaced by MUOS, inc 9.8°)
  28117,  // UFO 11 / USA 174 (2003, replaced by MUOS, inc 8.9°)
  37951,  // LUCH-5A (2011, no station-keeping, inc 8.5°)
  38977,  // LUCH-5B (2012, no station-keeping, inc 10.3°)
  36868,  // AEHF-1 / USA 214 (2010, inc 8.0°, likely retired — AEHF-4/5/6 cover its role)
  // LEO dead — far beyond design life
  21949,  // USA 81 (1991, NRO classified LEO, 35 years — no LEO sat survives this long)
  // COSMO-SKYMED 1 (31598), 2 (32376), 3 (33412) — still tracked by CelesTrak with current TLEs, kept active
  32289,  // YAOGAN-3 (2007, first-gen Chinese recon, design life 3-5 years)
  33446,  // YAOGAN-4 (2008, same generation)
  36110,  // YAOGAN-7 (2009, same generation)
  36834,  // YAOGAN-10 (2010, same generation)
  36519,  // COSMOS 2463 (2010, likely Lotos-S SIGINT, design life 5-7 years)
  // HEO dead — exceeded design life (7 years) by 2x
  37212,  // MERIDIAN 3 (2010, 16 years, design life 7)
  37398,  // MERIDIAN 4 (2011, 15 years, design life 7)
  // LEO dead — exceeded design life
  29268,  // ARIRANG-2 / KOMPSAT-2 (2006, design life 3 years, end of mission confirmed)
  // COSMO-SKYMED 3 (33412) — still tracked, kept active
]);

// Known retired/inactive weather satellite NORAD IDs
const WEATHER_EXCLUDED_NORADS = new Set([
  35491,  // GOES 14 (2009, in orbital storage since 2020)
  43226,  // GOES 17 (2018, degraded ABI cooler, replaced by GOES 18, orbital storage)
  36411,  // EWS-G2 / GOES 15 (2010, transferred to Space Force, decommissioned 2024)
  36744,  // COMS 1 (2010, design life 7 years, replaced by GEO-KOMPSAT-2A)
  32958,  // FENGYUN 3A (2008, 18 years, far exceeds 5-year design life)
  37214,  // FENGYUN 3B (2010, 16 years, far exceeds 5-year design life)
  40367,  // FENGYUN 2G (2014, design life 4 years, backup only)
  28912,  // METEOSAT-9 MSG-2 (2005, 21 years, backup/standby)
  40069,  // METEOR-M 2 (2014, partially degraded, replaced by M2-2/3/4)
  28054,  // DMSP F16 (2003, 23 years, severely degraded)
  37344,  // ELEKTRO-L 1 (2011, decommissioned)
  23327,  // ELEKTRO GOMS 1 (1994, decommissioned)
  // Additional confirmed decommissions
  29499,  // METOP-A (2006, officially decommissioned by ESA November 2021; replaced by METOP-C)
  40376,  // DMSP F19 (2014, primary SSUSI instrument failed Feb 2016, officially decommissioned Oct 2016)
  27509,  // METEOSAT-8 MSG-1 (2002, decommissioned April 2018; replaced by MSG-3/4)
  29640,  // FENGYUN 2D (2006, 20 years, CMA ended primary operations ~2015, well past design life)
  33463,  // FENGYUN 2E (2008, 18 years, CMA ended primary operations ~2019, standby/end-of-life)
]);

// Weather program inference from satellite name patterns
const WEATHER_PROGRAM_PATTERNS: [RegExp, string][] = [
  [/^GOES/i,                               'goes'],
  [/NOAA|JPSS|SUOMI|DMSP|CYGFM/i,         'jpss'],
  [/METEOSAT/i,                             'meteosat'],
  [/METOP/i,                               'metop'],
  [/FENGYUN|FY-/i,                         'fengyun'],
  [/TIANMU/i,                              'tianmu'],
  [/HIMAWARI/i,                            'himawari'],
  [/ARKTIKA/i,                             'arktika'],
  [/METEOR-M/i,                            'meteor'],
  [/ELEKTRO/i,                             'elektro'],
  [/INSAT-3D/i,                            'insat'],
  [/GEO-KOMPSAT|KOMPSAT/i,                'kompsat'],
];

function inferWeatherProgram(name: string): string {
  for (const [pattern, program] of WEATHER_PROGRAM_PATTERNS) {
    if (pattern.test(name)) return program;
  }
  return 'other';
}

// GNSS constellation inference from satellite name patterns
const GNSS_CONSTELLATION_PATTERNS: [RegExp, string][] = [
  [/^GPS |^GPS-|^NAVSTAR/i,               'gps'],
  [/^COSMOS 2/i,                           'glonass'],  // All GLONASS-M/K in gnss group
  [/^GSAT0/i,                              'galileo'],  // Galileo FOC/IOV (GSAT01xx, GSAT02xx…)
  [/^BEIDOU/i,                             'beidou'],
  [/^IRNSS-|^NVS-/i,                       'navic'],
  [/^QZS/i,                                'qzss'],
  [/WAAS|EGNOS|GAGAN|SDCM|SOUTHPAN|^LUCH 5/i, 'sbas'],
];

function inferConstellation(name: string): string {
  for (const [pattern, constellation] of GNSS_CONSTELLATION_PATTERNS) {
    if (pattern.test(name)) return constellation;
  }
  return 'sbas'; // Unknown nav satellite → augmentation fallback
}

// Country inference from satellite name patterns
const COUNTRY_PATTERNS: [RegExp, string][] = [
  [/^USA[ -]|^DMSP|^GPS |^GPS-|^GPS ?B|^NAVSTAR|^WGS|^AEHF|^SBIRS|^GSSAP|^MUOS|^NOSS|^DSP|^MILSTAR|^GOES|^NOAA|^SUOMI|^JPSS|^CYGFM|^EWS-G|^TDRS|^TERRA$|^AQUA$|^AURA$|^SWIFT$|^GPM|^MMS |^FGRST|^TIMED$|^SORCE$|^THEMIS|^WAAS/i, 'US'],
  [/^STARLINK/i, 'US'],
  [/^ISS |^PROGRESS|^SOYUZ|^NAUKA/i, 'RU'],
  [/^KOSMOS|^COSMOS|^METEOR-M|^GLONASS|^ELEKTRO|^ARKTIKA|^LUCH|^RAZDAN|^BARS-M|^LOTOS|^PION|^MOLNIYA|^MERIDIAN|^RADUGA|^ETALON|^SDCM/i, 'RU'],
  [/^FENGYUN|^FY-|^TIANMU|^COMS[^A]|^GK-|^BEIDOU|^SHIJIAN|^YAOGAN|^GAOFEN|^JILIN|^BDSBAS/i, 'CN'],
  [/^CSS |^TIANHE|^WENTIAN|^MENGTIAN|^TIANZHOU|^SHENZHOU/i, 'CN'],
  [/^METEOSAT|^METOP|^GALILEO|^GSAT01|^GSAT02|^GSAT03|^EGNOS/i, 'EU'],
  [/^HIMAWARI|^QZSS|^QZS-|^MICHIBIKI|^MSAS|^MTSAT/i, 'JP'],
  [/^INSAT|^IRNSS|^GSAT|^CMS-0|^CARTOSAT|^OCEANSAT|^GAGAN/i, 'IN'],
  [/^SAPPHIRE/i, 'CA'],
  [/^PRAETORIAN|^CREW DRAGON|^HST$|^HTV|^XTAR|^UFO/i, 'US'],
  [/^OFEK|^EROS|^OPTSAT/i, 'IL'],
  [/^SAR-LUPE|^SARAH|^COMSATBW/i, 'DE'],
  [/^HELIOS|^CSO[-\s]|^PLEIADES|^SYRACUSE|^ATHENA.FIDUS/i, 'FR'],
  [/^SKYNET|^SENTINEL/i, 'GB'],
  [/^KOMPSAT|^ARIRANG|^ANASIS/i, 'KR'],
  [/^GOKTURK/i, 'TR'],
  [/^KONDOR/i, 'RU'],
  [/^FALCON EYE/i, 'AE'],
  [/^PAZ$/i, 'ES'],
  [/^COSMO.SKYMED|^CSG-|^SICRAL/i, 'IT'],
  [/^RISAT|^CARTOSAT/i, 'IN'],
  [/^EGYPTSAT|^MISRSAT/i, 'EG'],
  [/SOUTHPAN/i, 'AU'],
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
// Prevent cache stampede: only one in-flight fetch per group at a time
const inflightFetches = new Map<string, Promise<unknown[]>>();

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
    res.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=7200');
    res.set('X-Cache', 'HIT');
    res.json(cached.data);
    return;
  }

  // Stampede protection: if another request is already fetching this group, wait for it
  const inflight = inflightFetches.get(group);
  if (inflight) {
    try {
      const data = await inflight;
      res.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=7200');
      res.set('X-Cache', 'COALESCED');
      res.json(data);
      return;
    } catch {
      // If the in-flight request failed, fall through to try ourselves
    }
  }

  // Determine which CelesTrak groups to fetch (may be composite)
  const groupsToFetch = COMPOSITE_GROUPS[group] || [group];

  const fetchPromise = (async () => {
  try {
    // Note: inflightFetches.set() called immediately after this IIFE is created
    // Fetch all sub-groups in parallel
    const responses = await Promise.all(
      groupsToFetch.map(g =>
        axios.get(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=json`, {
          timeout: 30_000,
          headers: { 'Accept': 'application/json' },
        })
      )
    );

    // Fetch supplemental NAME-based satellites (not in any GROUP)
    const nameQueries = SUPPLEMENTAL_NAME_FETCHES[group] || [];
    const nameResponses = nameQueries.length > 0
      ? await Promise.all(
          nameQueries.map(name =>
            axios.get(`https://celestrak.org/NORAD/elements/gp.php?NAME=${name}&FORMAT=json`, {
              timeout: 15_000,
              headers: { 'Accept': 'application/json' },
            }).catch(() => ({ data: [] }))
          )
        )
      : [];

    // Merge and deduplicate by NORAD_CAT_ID
    const seen = new Set<number>();
    const allOmm: any[] = [];
    for (let gi = 0; gi < responses.length; gi++) {
      const subGroup = groupsToFetch[gi];
      const arr = Array.isArray(responses[gi].data) ? responses[gi].data : [];
      const needsFilter = group === 'military' && !MILITARY_UNFILTERED_GROUPS.has(subGroup);
      for (const omm of arr) {
        const id = omm.NORAD_CAT_ID;
        if (!id || seen.has(id)) continue;
        if (needsFilter && !MILITARY_NAME_FILTER.test(omm.OBJECT_NAME || '')) continue;
        // Exclude known inactive/retired satellites
        if (group === 'military') {
          if (MILITARY_EXCLUDED_NORADS.has(id)) continue;
          // Skip very old COSMOS (pre-1990, all dead)
          if ((omm.OBJECT_NAME || '').startsWith('COSMOS') && id < 20000) continue;
        }
        if (group === 'weather' && WEATHER_EXCLUDED_NORADS.has(id)) continue;
        if (group === 'navigation' && NAVIGATION_EXCLUDED_NORADS.has(id)) continue;
        seen.add(id);
        allOmm.push(omm);
      }
    }
    // Add supplemental NAME results (apply same exclusion filters)
    for (let ni = 0; ni < nameResponses.length; ni++) {
      const queryName = nameQueries[ni];
      const arr = Array.isArray(nameResponses[ni].data) ? nameResponses[ni].data : [];
      for (const omm of arr) {
        const id = omm.NORAD_CAT_ID;
        const name = omm.OBJECT_NAME || '';
        if (!id || seen.has(id)) continue;
        // Skip false positives from substring matching (e.g. RISAT matches MARISAT)
        if (!name.toUpperCase().startsWith(queryName.toUpperCase())) continue;
        // Exclude known inactive satellites
        if (group === 'military') {
          if (MILITARY_EXCLUDED_NORADS.has(id)) continue;
          if (name.startsWith('COSMOS') && id < 20000) continue;
        }
        if (group === 'weather' && WEATHER_EXCLUDED_NORADS.has(id)) continue;
        if (group === 'navigation' && NAVIGATION_EXCLUDED_NORADS.has(id)) continue;
        seen.add(id);
        allOmm.push(omm);
      }
    }

    // Enrich each OMM entry with synthesized TLE lines + country
    const data = allOmm
      .map((omm: any) => {
        const tle = ommToTLELines(omm);
        if (!tle) return null;
        const name = omm.OBJECT_NAME || 'UNKNOWN';
        return {
          OBJECT_NAME: name,
          NORAD_CAT_ID: omm.NORAD_CAT_ID || 0,
          OBJECT_ID: omm.OBJECT_ID || '',
          COUNTRY: inferCountry(name),
          ...(group === 'navigation' ? { CONSTELLATION: inferConstellation(name) }
            : group === 'weather' ? { CONSTELLATION: inferWeatherProgram(name) }
            : {}),
          TLE_LINE1: tle.TLE_LINE1,
          TLE_LINE2: tle.TLE_LINE2,
        };
      })
      .filter(Boolean);

    tleCache.set(group, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (err: any) {
    // Serve stale cache if CelesTrak is down
    if (cached) return cached.data as unknown[];
    throw err;
  } finally {
    inflightFetches.delete(group);
  }
  })();

  // Register BEFORE awaiting so concurrent requests find it
  inflightFetches.set(group, fetchPromise);

  try {
    const data = await fetchPromise;
    res.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=7200');
    res.set('X-Cache', 'MISS');
    res.json(data);
  } catch (err: any) {
    console.error('[satellite/tle] CelesTrak proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch TLE data from CelesTrak' });
  }
}

// ─── Satellite Profiles ─────────────────────────────────────────────
// Returns all profiles for client-side regex lookup (cached 1h)
let profilesCache: { data: any[]; expiresAt: number } | null = null;
// Force cache invalidation on restart
profilesCache = null;

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
