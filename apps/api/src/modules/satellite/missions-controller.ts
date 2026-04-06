import type { Request, Response } from 'express';
import axios from 'axios';

// ─── Launch Library 2 proxy with in-memory cache ─────────────────────
const LL2_BASE = 'https://ll.thespacedevs.com/2.2.0';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Types ───────────────────────────────────────────────────────────
interface MissionCrewMember {
  name: string;
  role: string;
  agency: string;
  photo: string | null;
}

interface NormalizedMission {
  id: string;
  name: string;
  description: string;
  agency: string;
  agencyLogo: string | null;
  agencyCountryCode: string;
  status: 'in-flight' | 'upcoming' | 'completed';
  statusDescription: string;
  missionType: string;
  launchDate: string | null;
  landingDate: string | null;
  crew: MissionCrewMember[];
  missionPatch: string | null;
  image: string | null;
  vehicle: string | null;
  launchPad: {
    name: string;
    lat: number | null;
    lng: number | null;
  } | null;
  landingPad: {
    name: string;
    lat: number | null;
    lng: number | null;
  } | null;
  orbit: string | null;
  // ── Extended LL2 fields ──
  webcastLive: boolean;
  vidUrls: { title: string; url: string }[];
  infoUrls: { title: string; url: string }[];
  probability: number | null;
  hashtag: string | null;
  infographic: string | null;
  padDescription: string | null;
  padWikiUrl: string | null;
  agencySuccessRate: number | null;
  agencyConsecutiveSuccesses: number | null;
  agencyTotalLaunches: number | null;
  padCountryCode: string | null;
  padLocationName: string | null;
}

// ─── Cache ───────────────────────────────────────────────────────────
interface CachedData<T> {
  data: T;
  expiresAt: number;
}

const missionsCache: { list: CachedData<NormalizedMission[]> | null } = { list: null };
const detailCache = new Map<string, CachedData<NormalizedMission>>();

// ─── Agency color/code mapping ───────────────────────────────────────
const AGENCY_COUNTRY_MAP: Record<number, string> = {
  44: 'US',   // NASA
  121: 'US',  // SpaceX
  124: 'US',  // ULA
  257: 'US',  // Northrop Grumman
  265: 'US',  // Northrop Grumman (alt ID)
  141: 'US',  // Blue Origin
  88: 'CN',   // CASC (China Aerospace)
  17: 'CN',   // CNSA
  184: 'CN',  // China Rocket Co. Ltd.
  259: 'CN',  // LandSpace
  63: 'RU',   // ROSCOSMOS
  115: 'EU',  // ESA
  27: 'EU',   // ESA (alt ID)
  189: 'EU',  // Avio S.p.A
  31: 'IN',   // ISRO
  37: 'JP',   // JAXA
  147: 'US',  // Rocket Lab US
  199: 'NZ',  // Rocket Lab NZ
  66: 'CA',   // CSA
  190: 'EU',  // Arianespace
};

// Fallback: pad country code → 2-letter code for flag display
const PAD_COUNTRY_TO_CODE: Record<string, string> = {
  USA: 'US', CHN: 'CN', RUS: 'RU', IND: 'IN', JPN: 'JP',
  FRA: 'FR', GUF: 'FR', KAZ: 'RU', NZL: 'NZ', KOR: 'KR',
  ISR: 'IL', IRN: 'IR', BRA: 'BR', AUS: 'AU', GBR: 'GB',
};

// ─── Normalize LL2 data ──────────────────────────────────────────────
function normalizeLaunch(launch: any): NormalizedMission {
  const agencyId = launch.launch_service_provider?.id;
  const mission = launch.mission;
  const provider = launch.launch_service_provider;

  // Compute agency success rate
  const totalLaunches = provider?.total_launch_count ?? null;
  const successfulLaunches = provider?.successful_launches ?? null;
  const agencySuccessRate = totalLaunches && successfulLaunches != null
    ? Math.round((successfulLaunches / totalLaunches) * 1000) / 10
    : null;

  const vehicleName = launch.rocket?.configuration?.full_name || null;
  const agencyShort = provider?.abbrev || provider?.name?.split(' ')[0] || 'Unknown';
  let missionName = mission?.name || launch.name || 'Unknown Mission';
  let missionDesc = mission?.description || '';
  let missionType = mission?.type || 'Unknown';

  // Rename "Unknown Payload" to a more descriptive format
  if (missionName === 'Unknown Payload') {
    missionName = vehicleName ? `${vehicleName} · Classified` : `${agencyShort} · Classified Launch`;
    missionType = 'Classified';
    if (!missionDesc || missionDesc === 'Details TBD.') {
      missionDesc = 'Classified payload — details withheld by launch provider.';
    }
  }

  return {
    id: `launch-${launch.id}`,
    name: missionName,
    description: missionDesc,
    agency: provider?.name || 'Unknown',
    agencyLogo: provider?.logo_url || null,
    agencyCountryCode: AGENCY_COUNTRY_MAP[agencyId] || PAD_COUNTRY_TO_CODE[launch.pad?.location?.country_code] || '',
    status: mapLaunchStatus(launch.status?.id),
    statusDescription: launch.status?.name || '',
    missionType,
    launchDate: launch.net || null,
    landingDate: null,
    crew: [],
    missionPatch: launch.mission_patches?.[0]?.image_url
      || launch.program?.[0]?.mission_patches?.[0]?.image_url
      || null,
    image: typeof launch.image === 'string' ? launch.image : (launch.image?.image_url || null),
    vehicle: vehicleName,
    launchPad: launch.pad ? {
      name: launch.pad.name || '',
      lat: parseFloat(launch.pad.latitude) || null,
      lng: parseFloat(launch.pad.longitude) || null,
    } : null,
    landingPad: null,
    orbit: mission?.orbit?.name || null,
    // Extended LL2 fields
    webcastLive: launch.webcast_live ?? false,
    vidUrls: (launch.vid_urls ?? []).map((v: any) => ({ title: v.title || 'Webcast', url: v.url })),
    infoUrls: (launch.info_urls ?? []).map((v: any) => ({ title: v.title || 'Info', url: v.url })),
    probability: launch.probability ?? null,
    hashtag: launch.hashtag || null,
    infographic: launch.infographic || null,
    padDescription: launch.pad?.description || null,
    padWikiUrl: launch.pad?.wiki_url || null,
    agencySuccessRate,
    agencyConsecutiveSuccesses: provider?.consecutive_successful_launches ?? null,
    agencyTotalLaunches: totalLaunches,
    padCountryCode: launch.pad?.location?.country_code || null,
    padLocationName: launch.pad?.location?.name || null,
  };
}

function mapLaunchStatus(statusId: number): 'in-flight' | 'upcoming' | 'completed' {
  // LL2 launch status IDs: 1=Go, 2=TBD, 3=Success, 4=Failure, 5=Hold, 6=In Flight, 7=Partial Failure, 8=TBC
  if (statusId === 6) return 'in-flight';
  if (statusId === 3 || statusId === 4 || statusId === 7) return 'completed';
  return 'upcoming';
}

// ─── In-flight detection for crewed missions ────────────────────────
// LL2 marks launches as "Success" once the rocket reaches orbit, but crewed
// missions (Artemis, Soyuz, Dragon) stay in-flight for days/weeks after.
// We check recent launches and override status to 'in-flight' if the mission
// is likely still active.
const CREWED_MISSION_TYPES = new Set(['Human Exploration', 'Tourism', 'Crew']);
const IN_FLIGHT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// Known mission durations (days) for missions where LL2 doesn't provide landing date
// Landing date is computed dynamically from actual launch date + durationDays
const KNOWN_MISSION_DURATIONS: Record<string, { durationDays: number }> = {
  'artemis ii': { durationDays: 10 },
  'artemis 2': { durationDays: 10 },
  'soyuz': { durationDays: 190 },
  'crew dragon': { durationDays: 180 },
};

function isLikelyInFlight(launch: any): boolean {
  const net = launch.net ? new Date(launch.net).getTime() : 0;
  const now = Date.now();
  const age = now - net;

  // Must have launched recently
  if (age < 0 || age > IN_FLIGHT_WINDOW_MS) return false;

  // Must be a successful launch (status 3)
  if (launch.status?.id !== 3) return false;

  // Check if mission type is crewed/exploration
  const mType = launch.mission?.type || '';
  if (CREWED_MISSION_TYPES.has(mType)) return true;

  // Check known missions by name (partial match)
  const name = (launch.mission?.name || launch.name || '').toLowerCase();
  for (const [pattern, dur] of Object.entries(KNOWN_MISSION_DURATIONS)) {
    if (name.includes(pattern)) {
      const landingTime = net + dur.durationDays * 24 * 60 * 60 * 1000;
      return now < landingTime;
    }
  }

  return false;
}

function getKnownLandingDate(name: string, launchDate: string): string | null {
  const key = name.toLowerCase();
  for (const [pattern, dur] of Object.entries(KNOWN_MISSION_DURATIONS)) {
    if (key.includes(pattern)) {
      return new Date(new Date(launchDate).getTime() + dur.durationDays * 24 * 60 * 60 * 1000).toISOString();
    }
  }
  return null;
}

// ─── Fetch from LL2 ──────────────────────────────────────────────────
const MAX_MISSIONS = 20;

async function fetchMissionsFromLL2(): Promise<NormalizedMission[]> {
  const missions: NormalizedMission[] = [];
  const seenIds = new Set<string>();

  // 1. Recent launches — detect in-flight crewed missions
  try {
    const { data } = await axios.get(`${LL2_BASE}/launch/previous/`, {
      params: {
        limit: 10,
        format: 'json',
        ordering: '-net',
      },
      timeout: 15_000,
    });
    for (const launch of data.results || []) {
      if (isLikelyInFlight(launch)) {
        const normalized = normalizeLaunch(launch);
        normalized.status = 'in-flight';
        // Add known landing date if available
        const missionName = launch.mission?.name || launch.name || '';
        const landing = getKnownLandingDate(missionName, normalized.launchDate || '');
        if (landing) normalized.landingDate = landing;
        if (!seenIds.has(normalized.id)) {
          seenIds.add(normalized.id);
          missions.push(normalized);
        }
      }
    }
  } catch (err: any) {
    console.warn('[missions] Failed to fetch previous launches:', err.message);
  }

  // 2. Upcoming launches (next 7 days)
  try {
    const { data } = await axios.get(`${LL2_BASE}/launch/upcoming/`, {
      params: {
        limit: 25,
        format: 'json',
        ordering: 'net',
      },
      timeout: 15_000,
    });
    for (const launch of data.results || []) {
      const normalized = normalizeLaunch(launch);
      if (!seenIds.has(normalized.id)) {
        seenIds.add(normalized.id);
        missions.push(normalized);
      }
    }
  } catch (err: any) {
    console.warn('[missions] Failed to fetch upcoming launches:', err.message);
  }

  // Sort: in-flight first, then upcoming by date
  const statusOrder: Record<string, number> = { 'in-flight': 0, 'upcoming': 1, 'completed': 2 };
  missions.sort((a, b) => {
    const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (so !== 0) return so;
    const da = a.launchDate ? new Date(a.launchDate).getTime() : Infinity;
    const db = b.launchDate ? new Date(b.launchDate).getTime() : Infinity;
    return da - db;
  });

  return missions.slice(0, MAX_MISSIONS);
}

// ─── Route handlers ──────────────────────────────────────────────────
export async function getMissions(_req: Request, res: Response) {
  // Check cache
  if (missionsCache.list && missionsCache.list.expiresAt > Date.now()) {
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
    res.set('X-Cache', 'HIT');
    res.json(missionsCache.list.data);
    return;
  }

  try {
    const missions = await fetchMissionsFromLL2();
    missionsCache.list = { data: missions, expiresAt: Date.now() + CACHE_TTL_MS };
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
    res.set('X-Cache', 'MISS');
    res.json(missions);
  } catch (err: any) {
    console.error('[missions] Failed to fetch missions:', err.message);

    // Serve stale cache if available
    if (missionsCache.list) {
      res.set('X-Cache', 'STALE');
      res.json(missionsCache.list.data);
      return;
    }
    res.status(502).json({ error: 'Failed to fetch mission data' });
  }
}

export async function getMissionDetail(req: Request, res: Response) {
  const { id } = req.params;

  // Check detail cache
  const cached = detailCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
    res.set('X-Cache', 'HIT');
    res.json(cached.data);
    return;
  }

  // Try to find in the list cache first
  if (missionsCache.list) {
    const found = missionsCache.list.data.find(m => m.id === id);
    if (found) {
      detailCache.set(id, { data: found, expiresAt: Date.now() + CACHE_TTL_MS });
      res.set('X-Cache', 'LIST-HIT');
      res.json(found);
      return;
    }
  }

  try {
    const rawId = id.replace(/^launch-/, '');
    const { data } = await axios.get(`${LL2_BASE}/launch/${rawId}/`, {
      params: { format: 'json' },
      timeout: 15_000,
    });
    const mission = normalizeLaunch(data);

    detailCache.set(id, { data: mission, expiresAt: Date.now() + CACHE_TTL_MS });
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
    res.json(mission);
  } catch (err: any) {
    console.error(`[missions] Failed to fetch detail for ${id}:`, err.message);
    res.status(404).json({ error: 'Mission not found' });
  }
}
