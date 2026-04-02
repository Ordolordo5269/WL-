/**
 * UCDP Candidate Events Service
 * Fetches v26.0.2 (Jan–Mar 2026) into memory, aggregates per country:
 *   - violence profile (% state-based / non-state / one-sided)
 *   - active factions (side_a / side_b, with XXX label resolution)
 *   - geographic hotspots (adm_1 level)
 *   - heatmap points for WorldMap
 *
 * Cache TTL: 24 h, refreshed at startup.
 */

import { fetchGedEvents, type UcdpRawEvent } from './client.js';
import { logger } from '../../config/logger.js';

// ─── UCDP Candidate version to use ──────────────────────────────────────────
const CANDIDATE_VERSION = '26.0.2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ─── XXX actor label resolution ─────────────────────────────────────────────
// These IDs are permanently anonymised in UCDP. Labels derived from source
// headlines and country context (investigated 2026-03-31).
const XXX_LABELS: Record<number, string> = {
  3611: 'Unidentified criminal groups',   // Belize
  3617: 'Unidentified armed groups',      // Brazil
  3621: 'Unidentified armed groups',      // Burundi
  3623: 'Unidentified armed groups',      // Nigeria (NE)
  3626: 'Unidentified armed groups',      // Central African Republic
  3627: 'Unidentified armed groups',      // Chad
  3630: 'Unidentified armed groups',      // Colombia
  3650: 'Unidentified armed groups',      // Ethiopia
  3659: 'Unidentified armed groups',      // Ghana
  3665: 'Unidentified armed groups',      // Haiti
  3671: 'Unidentified armed groups',      // Iran
  3674: 'Unidentified armed groups',      // Israel
  3702: 'Unidentified criminal groups',   // Mexico
  3713: 'Jihadist militants',             // Niger (JNIM/IS-Sahel, from headlines)
  3714: 'Armed bandits',                  // Nigeria NW (explicitly named in sources)
  3736: 'Unidentified armed groups',      // Somalia
  3745: 'Unidentified gunmen',            // Syria (literally: "unidentified gunmen")
  3759: 'Unidentified armed groups',      // Colombia (2nd code)
  3764: 'Unidentified armed groups',      // Yemen
  3769: 'Unidentified armed groups',      // Dominica
};

const CIVILIANS_ID = 9999;

function resolveActorName(name: string, id: number): string {
  if (id === CIVILIANS_ID) return 'Civilians';
  if (name.startsWith('XXX')) return XXX_LABELS[id] ?? 'Unidentified armed group';
  return name;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UcdpFaction {
  id: number;
  name: string;           // resolved (no XXX)
  rawName: string;        // original UCDP name
  isXxx: boolean;
  role: 'side_a' | 'side_b';
  events: number;
  deathsInflicted: number;
  zones: string[];        // unique adm_1 values
}

export interface UcdpHotspot {
  adm1: string;
  adm2: string | null;
  lat: number;
  lng: number;
  events: number;
  deaths: number;
  dominantType: number;   // 1 | 2 | 3
  factions: string[];
}

export interface UcdpViolenceProfile {
  stateBased: number;    // count
  nonState: number;
  oneSided: number;
  total: number;
  stateBasedPct: number;
  nonStatePct: number;
  oneSidedPct: number;
}

export interface UcdpConflictProfile {
  country: string;
  conflictName: string;
  totalEvents: number;
  totalDeaths: number;
  latestDate: string;
  violenceProfile: UcdpViolenceProfile;
  factions: UcdpFaction[];
  hotspots: UcdpHotspot[];   // sorted by events desc
}

export interface UcdpHeatmapPoint {
  lat: number;
  lng: number;
  weight: number;          // 0-1, based on events + deaths
  adm1: string;
  country: string;
  typeOfViolence: number;
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

let profilesByCountry = new Map<string, UcdpConflictProfile[]>();
let heatmapPoints: UcdpHeatmapPoint[] = [];
let cacheTimestamp = 0;
let initialised = false;

// ─── Aggregation logic ───────────────────────────────────────────────────────

function buildProfiles(events: UcdpRawEvent[]): {
  byCountry: Map<string, UcdpConflictProfile[]>;
  heatmap: UcdpHeatmapPoint[];
} {
  // Group by country + conflict_new_id
  type ConflictKey = string; // `${country}::${conflict_new_id}`
  const conflictMap = new Map<ConflictKey, UcdpRawEvent[]>();

  for (const ev of events) {
    const key: ConflictKey = `${ev.country}::${ev.conflict_new_id}`;
    if (!conflictMap.has(key)) conflictMap.set(key, []);
    conflictMap.get(key)!.push(ev);
  }

  // Build heatmap points aggregated by lat/lng bucket (adm_1 level)
  type HotspotKey = string; // `${lat.toFixed(3)},${lng.toFixed(3)}`
  const hotspotMap = new Map<HotspotKey, {
    lat: number; lng: number; adm1: string; country: string;
    events: number; deaths: number; types: number[];
  }>();

  for (const ev of events) {
    if (!ev.latitude || !ev.longitude) continue;
    const key: HotspotKey = `${ev.latitude.toFixed(3)},${ev.longitude.toFixed(3)}`;
    if (!hotspotMap.has(key)) {
      hotspotMap.set(key, {
        lat: ev.latitude, lng: ev.longitude,
        adm1: ev.adm_1 || ev.where_description || '',
        country: ev.country,
        events: 0, deaths: 0, types: [],
      });
    }
    const h = hotspotMap.get(key)!;
    h.events++;
    h.deaths += (ev.deaths_a || 0) + (ev.deaths_b || 0) + (ev.deaths_civilians || 0) + (ev.deaths_unknown || 0);
    h.types.push(ev.type_of_violence);
  }

  // Normalize heatmap weights
  const maxEvents = Math.max(...[...hotspotMap.values()].map(h => h.events), 1);
  const heatmap: UcdpHeatmapPoint[] = [...hotspotMap.values()].map(h => {
    const typeCounts = [1, 2, 3].map(t => h.types.filter(x => x === t).length);
    const dominantType = typeCounts.indexOf(Math.max(...typeCounts)) + 1;
    return {
      lat: h.lat,
      lng: h.lng,
      weight: Math.min(h.events / maxEvents, 1),
      adm1: h.adm1,
      country: h.country,
      typeOfViolence: dominantType,
    };
  });

  // Build per-conflict profiles
  const byCountry = new Map<string, UcdpConflictProfile[]>();

  for (const [key, evs] of conflictMap) {
    const country = key.split('::')[0];
    const conflictName = evs[0].conflict_name;

    // Violence profile
    const stateBased = evs.filter(e => e.type_of_violence === 1).length;
    const nonState   = evs.filter(e => e.type_of_violence === 2).length;
    const oneSided   = evs.filter(e => e.type_of_violence === 3).length;
    const total      = evs.length;
    const violenceProfile: UcdpViolenceProfile = {
      stateBased, nonState, oneSided, total,
      stateBasedPct: total ? Math.round((stateBased / total) * 100) : 0,
      nonStatePct:   total ? Math.round((nonState   / total) * 100) : 0,
      oneSidedPct:   total ? Math.round((oneSided   / total) * 100) : 0,
    };

    // Factions — accumulate per side_a_new_id / side_b_new_id
    const factionMap = new Map<string, UcdpFaction>();

    for (const ev of evs) {
      const adm1 = ev.adm_1 || ev.where_description || '';

      // side_a
      const aKey = `a::${ev.side_a_new_id}`;
      if (!factionMap.has(aKey)) {
        factionMap.set(aKey, {
          id: ev.side_a_new_id,
          name: resolveActorName(ev.side_a, ev.side_a_new_id),
          rawName: ev.side_a,
          isXxx: ev.side_a.startsWith('XXX'),
          role: 'side_a',
          events: 0, deathsInflicted: 0, zones: [],
        });
      }
      const fa = factionMap.get(aKey)!;
      fa.events++;
      fa.deathsInflicted += ev.deaths_b || 0;
      if (adm1 && !fa.zones.includes(adm1)) fa.zones.push(adm1);

      // side_b (skip Civilians as a "faction")
      if (ev.side_b_new_id !== CIVILIANS_ID) {
        const bKey = `b::${ev.side_b_new_id}`;
        if (!factionMap.has(bKey)) {
          factionMap.set(bKey, {
            id: ev.side_b_new_id,
            name: resolveActorName(ev.side_b, ev.side_b_new_id),
            rawName: ev.side_b,
            isXxx: ev.side_b.startsWith('XXX'),
            role: 'side_b',
            events: 0, deathsInflicted: 0, zones: [],
          });
        }
        const fb = factionMap.get(bKey)!;
        fb.events++;
        fb.deathsInflicted += ev.deaths_a || 0;
        if (adm1 && !fb.zones.includes(adm1)) fb.zones.push(adm1);
      }
    }

    // Hotspots
    const hotspotByAdm = new Map<string, UcdpHotspot>();
    for (const ev of evs) {
      const adm1 = ev.adm_1 || ev.where_description || 'Unknown';
      if (!hotspotByAdm.has(adm1)) {
        hotspotByAdm.set(adm1, {
          adm1,
          adm2: ev.adm_2 || null,
          lat: ev.latitude,
          lng: ev.longitude,
          events: 0, deaths: 0,
          dominantType: ev.type_of_violence,
          factions: [],
        });
      }
      const hs = hotspotByAdm.get(adm1)!;
      hs.events++;
      hs.deaths += (ev.deaths_a || 0) + (ev.deaths_b || 0) + (ev.deaths_civilians || 0) + (ev.deaths_unknown || 0);
      const fa = resolveActorName(ev.side_a, ev.side_a_new_id);
      if (!hs.factions.includes(fa)) hs.factions.push(fa);
      if (ev.side_b_new_id !== CIVILIANS_ID) {
        const fb = resolveActorName(ev.side_b, ev.side_b_new_id);
        if (!hs.factions.includes(fb)) hs.factions.push(fb);
      }
    }

    const totalDeaths = evs.reduce((s, e) =>
      s + (e.deaths_a || 0) + (e.deaths_b || 0) + (e.deaths_civilians || 0) + (e.deaths_unknown || 0), 0);

    const dates = evs.map(e => e.date_end).sort();
    const latestDate = dates[dates.length - 1];

    const profile: UcdpConflictProfile = {
      country,
      conflictName,
      totalEvents: total,
      totalDeaths,
      latestDate,
      violenceProfile,
      factions: [...factionMap.values()].sort((a, b) => b.events - a.events),
      hotspots: [...hotspotByAdm.values()].sort((a, b) => b.events - a.events),
    };

    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country)!.push(profile);
  }

  return { byCountry, heatmap };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getCandidateProfile(country: string): UcdpConflictProfile[] | null {
  return profilesByCountry.get(country) ?? null;
}

export function getHeatmapPoints(): UcdpHeatmapPoint[] {
  return heatmapPoints;
}

export function getCacheAge(): { ageMs: number; version: string; totalEvents: number } {
  return {
    ageMs: Date.now() - cacheTimestamp,
    version: CANDIDATE_VERSION,
    totalEvents: heatmapPoints.length,
  };
}

// ─── Cache refresh ───────────────────────────────────────────────────────────

export async function refreshCandidateCache(): Promise<void> {
  logger.info({ version: CANDIDATE_VERSION }, 'Refreshing UCDP candidate cache...');
  try {
    const events = await fetchGedEvents(CANDIDATE_VERSION);
    const { byCountry, heatmap } = buildProfiles(events);
    profilesByCountry = byCountry;
    heatmapPoints = heatmap;
    cacheTimestamp = Date.now();
    logger.info(
      { events: events.length, countries: byCountry.size, heatmapPoints: heatmap.length },
      'UCDP candidate cache refreshed'
    );
  } catch (err) {
    logger.error({ err }, 'Failed to refresh UCDP candidate cache — keeping stale data');
    // Do NOT rethrow — stale cache is better than crashing the server
  }
}

/**
 * Call once at server startup. Schedules a 24h refresh loop.
 */
export async function initCandidateService(): Promise<void> {
  if (initialised) return;
  initialised = true;
  await refreshCandidateCache();
  setInterval(() => {
    refreshCandidateCache().catch(err =>
      logger.error({ err }, 'Scheduled UCDP cache refresh failed')
    );
  }, CACHE_TTL_MS);
}
