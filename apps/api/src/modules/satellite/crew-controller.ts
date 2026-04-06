import type { Request, Response } from 'express';
import axios from 'axios';

// ─── Launch Library 2 — Crew in Space ──────────────────────────────
const LL2_BASE = 'https://ll.thespacedevs.com/2.2.0';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─── Types ─────────────────────────────────────────────────────────
interface NormalizedCrew {
  id: number;
  name: string;
  nationality: string;
  countryCode: string;
  agency: string;
  agencyAbbrev: string;
  photo: string | null;
  spacecraft: string;
  role: string;
  launchDate: string | null;
  daysInSpace: number;
}

// ─── Country code mapping ──────────────────────────────────────────
const NATIONALITY_TO_CODE: Record<string, string> = {
  American: 'US', Russian: 'RU', Chinese: 'CN', Japanese: 'JP',
  Canadian: 'CA', German: 'DE', French: 'FR', Italian: 'IT',
  British: 'GB', Indian: 'IN', Korean: 'KR', Brazilian: 'BR',
  Australian: 'AU', Swedish: 'SE', Danish: 'DK', Spanish: 'ES',
  Emirati: 'AE', Saudi: 'SA', Turkish: 'TR', Belarusian: 'BY',
  Ukrainian: 'UA', Israeli: 'IL', Polish: 'PL', Czech: 'CZ',
  Hungarian: 'HU', Austrian: 'AT', Belgian: 'BE', Dutch: 'NL',
  Swiss: 'CH', Norwegian: 'NO', Finnish: 'FI', Irish: 'IE',
  Mexican: 'MX', Kazakh: 'KZ',
};

// ─── Cache ─────────────────────────────────────────────────────────
let crewCache: { data: NormalizedCrew[]; expiresAt: number } | null = null;

// ─── Normalize ─────────────────────────────────────────────────────
function normalizeAstronaut(a: any): NormalizedCrew {
  const nationality = a.nationality || '';
  const countryCode = NATIONALITY_TO_CODE[nationality] || a.agency?.country_code || '';

  // Calculate days in space from last flight launch date
  const lastFlight = a.last_flight;
  const launchDate = lastFlight || null;
  const daysInSpace = launchDate
    ? Math.max(0, Math.floor((Date.now() - new Date(launchDate).getTime()) / (24 * 60 * 60 * 1000)))
    : 0;

  // Deduce spacecraft from agency — refined in post-processing
  const agencyName = a.agency?.name || '';
  const agencyAbbrev = a.agency?.abbrev || '';
  let spacecraft = 'ISS'; // default for Western agencies
  if (/China|CNSA|CASC/i.test(agencyName)) {
    spacecraft = 'Tiangong';
  }

  return {
    id: a.id,
    name: a.name || 'Unknown',
    nationality,
    countryCode,
    agency: agencyName,
    agencyAbbrev,
    photo: a.profile_image || a.profile_image_thumbnail || null,
    spacecraft,
    role: a.type?.name || 'Crew',
    launchDate,
    daysInSpace,
  };
}

// ─── Fetch from LL2 ────────────────────────────────────────────────
async function fetchCrewFromLL2(): Promise<NormalizedCrew[]> {
  const { data } = await axios.get(`${LL2_BASE}/astronaut/`, {
    params: {
      in_space: true,
      limit: 25,
      format: 'json',
    },
    timeout: 15_000,
  });

  const crew = (data.results || [])
    .filter((a: any) => a.type?.name !== 'Non-Human')
    .map(normalizeAstronaut);

  // Post-process: identify deep-space missions by recent launch date (< 30 days)
  // Crew who launched very recently together and aren't on Tiangong are likely on a special mission
  const recentCrew = crew.filter((c: NormalizedCrew) => c.spacecraft !== 'Tiangong' && c.daysInSpace <= 30);
  if (recentCrew.length > 0 && recentCrew.length <= 6) {
    // Small crew launched recently → likely Artemis or similar deep-space mission
    const launchDates = new Set(recentCrew.map((c: NormalizedCrew) => c.launchDate?.slice(0, 10)));
    if (launchDates.size === 1) {
      // All launched on same day → same mission
      for (const c of recentCrew) {
        c.spacecraft = 'Orion (Artemis II)';
      }
    }
  }

  // Sort by spacecraft group, then days in space descending
  const craftOrder: Record<string, number> = { 'Orion (Artemis II)': 0, 'ISS': 1, 'Tiangong': 2 };
  crew.sort((a: NormalizedCrew, b: NormalizedCrew) => {
    const oa = craftOrder[a.spacecraft] ?? 3;
    const ob = craftOrder[b.spacecraft] ?? 3;
    if (oa !== ob) return oa - ob;
    return b.daysInSpace - a.daysInSpace;
  });

  return crew;
}

// ─── Route handler ─────────────────────────────────────────────────
export async function getCrew(_req: Request, res: Response) {
  if (crewCache && crewCache.expiresAt > Date.now()) {
    res.set('Cache-Control', 'public, max-age=21600');
    res.set('X-Cache', 'HIT');
    res.json(crewCache.data);
    return;
  }

  try {
    const crew = await fetchCrewFromLL2();
    crewCache = { data: crew, expiresAt: Date.now() + CACHE_TTL_MS };
    res.set('Cache-Control', 'public, max-age=21600');
    res.set('X-Cache', 'MISS');
    res.json(crew);
  } catch (err: any) {
    console.error('[crew] Failed to fetch crew from LL2:', err.message);

    if (crewCache) {
      res.set('X-Cache', 'STALE');
      res.json(crewCache.data);
      return;
    }

    // LL2 unavailable (rate-limited) and no cache — return empty gracefully
    res.set('X-Cache', 'EMPTY');
    res.json([]);
  }
}
