// ─── Satellite Profile Database ─────────────────────────────────────
// Fetches profiles from API on first use, then does client-side regex lookup.
// Zero latency after initial load — no API call per satellite click.

// ─── Country data ───────────────────────────────────────────────────
export const COUNTRY_FLAGS: Record<string, string> = {
  US: '\uD83C\uDDFA\uD83C\uDDF8', CN: '\uD83C\uDDE8\uD83C\uDDF3', RU: '\uD83C\uDDF7\uD83C\uDDFA',
  EU: '\uD83C\uDDEA\uD83C\uDDFA', JP: '\uD83C\uDDEF\uD83C\uDDF5', IN: '\uD83C\uDDEE\uD83C\uDDF3',
  CA: '\uD83C\uDDE8\uD83C\uDDE6', KR: '\uD83C\uDDF0\uD83C\uDDF7', IL: '\uD83C\uDDEE\uD83C\uDDF1',
  FR: '\uD83C\uDDEB\uD83C\uDDF7', DE: '\uD83C\uDDE9\uD83C\uDDEA', GB: '\uD83C\uDDEC\uD83C\uDDE7',
  TR: '\uD83C\uDDF9\uD83C\uDDF7', IT: '\uD83C\uDDEE\uD83C\uDDF9', ES: '\uD83C\uDDEA\uD83C\uDDF8',
  AE: '\uD83C\uDDE6\uD83C\uDDEA', EG: '\uD83C\uDDEA\uD83C\uDDEC',
  AU: '\uD83C\uDDE6\uD83C\uDDFA',
};
export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CN: 'China', RU: 'Russia', EU: 'European Union',
  JP: 'Japan', IN: 'India', CA: 'Canada', KR: 'South Korea',
  IL: 'Israel', FR: 'France', DE: 'Germany', GB: 'United Kingdom',
  TR: 'Turkey', IT: 'Italy', ES: 'Spain', AE: 'UAE', EG: 'Egypt',
  AU: 'Australia',
};

export interface SatelliteProfile {
  program: string;
  operator: string;
  purpose: string;
  coverage: string;
  orbitType: string;
  description: string;
  imageUrl: string | null;
}

interface DBProfile {
  id: number;
  pattern: string;
  matchType: string;
  program: string;
  operator: string;
  purpose: string;
  coverage: string;
  orbitType: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
}

// ─── Cached profiles from API ───────────────────────────────────────

let patternProfiles: { regex: RegExp; profile: SatelliteProfile }[] = [];
let countryFallbacks: Map<string, SatelliteProfile> = new Map();
let loaded = false;
let loadingPromise: Promise<void> | null = null;

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');

function toProfile(row: DBProfile): SatelliteProfile {
  return {
    program: row.program,
    operator: row.operator,
    purpose: row.purpose,
    coverage: row.coverage,
    orbitType: row.orbitType,
    description: row.description,
    imageUrl: row.imageUrl,
  };
}

async function loadProfiles(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/satellite/profiles`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows: DBProfile[] = json.data || [];

    patternProfiles = [];
    countryFallbacks = new Map();

    for (const row of rows) {
      const profile = toProfile(row);
      if (row.matchType === 'country') {
        countryFallbacks.set(row.pattern.toUpperCase(), profile);
      } else {
        try {
          patternProfiles.push({ regex: new RegExp(row.pattern, 'i'), profile });
        } catch {
          // Skip invalid regex patterns
        }
      }
    }
    loaded = true;
  } catch (err) {
    console.warn('[satellite-database] Failed to load profiles from API, using fallback:', err);
    loaded = true; // Don't retry — use default profile
  }
}

const DEFAULT_PROFILE: SatelliteProfile = {
  program: 'Unclassified Satellite',
  operator: 'Unknown operator',
  purpose: 'Unknown mission',
  coverage: 'Varies',
  orbitType: 'Varies',
  description:
    'Orbital parameters and basic tracking data are available from public catalogs, but detailed mission information for this satellite is not included in the current database.',
  imageUrl: null,
};

// ─── Public API ─────────────────────────────────────────────────────

/** Ensure profiles are loaded (call early, e.g. on app mount) */
export function preloadSatelliteProfiles(): void {
  if (!loaded && !loadingPromise) {
    loadingPromise = loadProfiles().finally(() => { loadingPromise = null; });
  }
}

function lookupSync(objectName: string, countryCode?: string): SatelliteProfile {
  const name = objectName.trim().toUpperCase();
  for (const { regex, profile } of patternProfiles) {
    if (regex.test(name)) return profile;
  }
  if (countryCode) {
    const fallback = countryFallbacks.get(countryCode.trim().toUpperCase());
    if (fallback) return fallback;
  }
  return DEFAULT_PROFILE;
}

/**
 * Look up a satellite profile by its OBJECT_NAME and optional COUNTRY code.
 * Returns synchronously from cache after initial load.
 */
export function getSatelliteProfile(
  objectName: string,
  countryCode?: string,
): SatelliteProfile {
  if (!loaded && !loadingPromise) {
    loadingPromise = loadProfiles().finally(() => { loadingPromise = null; });
  }
  return lookupSync(objectName, countryCode);
}

/**
 * Async version — waits for profiles to load before doing lookup.
 * Use this when you need guaranteed data (e.g. opening a card).
 */
export async function getSatelliteProfileAsync(
  objectName: string,
  countryCode?: string,
): Promise<SatelliteProfile> {
  if (!loaded) {
    if (!loadingPromise) {
      loadingPromise = loadProfiles().finally(() => { loadingPromise = null; });
    }
    await loadingPromise;
  }
  return lookupSync(objectName, countryCode);
}
