// Data service to fetch GDP per capita from database, cache it,
// compute quantile buckets, and build a Mapbox match expression to color countries.

export type Iso3 = string;

export interface GdpPerCapitaEntry {
  iso3: Iso3;
  value: number | null;
  year: number | null;
}

export interface ChoroplethSpec {
  iso3ToColor: Record<Iso3, string>;
  legend: Array<{ label: string; color: string; min?: number; max?: number }>;
  defaultColor: string;
}

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
}

function makeCacheKey(): string {
  return 'db:gdp-per-capita:latest';
}

function nowMs(): number {
  return Date.now();
}

function saveCache<T>(key: string, value: T, ttlMs: number = DEFAULT_CACHE_TTL_MS) {
  try {
    const payload = { v: value, e: nowMs() + ttlMs };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

function loadCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: { v: T; e: number } = JSON.parse(raw);
    if (!parsed || typeof parsed.e !== 'number' || nowMs() > parsed.e) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

export async function fetchGdpPerCapitaLatestByIso3(options?: {
  yearWindow?: string;
  cacheTtlMs?: number;
  forceRefresh?: boolean;
}): Promise<Record<Iso3, GdpPerCapitaEntry>> {
  const cacheKey = makeCacheKey();
  // Only clear cache when explicitly requested (forceRefresh)
  if (options?.forceRefresh) {
    try { localStorage.removeItem(cacheKey); } catch {}
  }
  const cached = loadCache<Record<Iso3, GdpPerCapitaEntry>>(cacheKey);
  if (cached && !options?.forceRefresh) return cached;

  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/api/indicators/gdp-per-capita/latest`;
  
  try {
    console.log(`GDP Per Capita Service: Fetching from ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      let errorText = '';
      try {
        errorText = await res.text();
      } catch {
        errorText = 'Unable to read error response';
      }
      console.error(`GDP Per Capita API error ${res.status}:`, errorText);
      throw new Error(`Database GDP Per Capita API error: ${res.status} - ${errorText}`);
    }
    const data = (await res.json()) as Record<string, GdpPerCapitaEntry>;
    
    if (!data || typeof data !== 'object') {
      console.error('GDP Per Capita API: Invalid response format', data);
      return {};
    }
    
    // Normalize ISO3 codes to uppercase
    const byIso3: Record<Iso3, GdpPerCapitaEntry> = {};
    for (const [iso3, entry] of Object.entries(data)) {
      if (iso3 && iso3.length === 3 && entry) {
        byIso3[iso3.toUpperCase()] = {
          iso3: iso3.toUpperCase(),
          value: entry.value ?? null,
          year: entry.year ?? null
        };
      }
    }

    const count = Object.keys(byIso3).length;
    console.log(`GDP Per Capita Service: Successfully loaded ${count} countries from database`);
    
    const ttl = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    saveCache(cacheKey, byIso3, ttl);
    return byIso3;
  } catch (err) {
    console.error('Error fetching GDP per capita from database:', err);
    if (err instanceof Error) {
      console.error('Error details:', err.message);
    }
    // On failure, return empty map; caller can handle gracefully.
    return {};
  }
}

function computeQuantileThresholds(values: number[], quantiles: number[]): number[] {
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  return quantiles.map(q => sorted[Math.min(n - 1, Math.max(0, Math.floor(q * (n - 1))))]);
}

function formatAbbrevUSD(value: number): string {
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function buildGdpPerCapitaChoropleth(byIso3: Record<Iso3, GdpPerCapitaEntry>, options?: {
  palette?: string[]; // low->high
  defaultColor?: string;
  buckets?: number; // number of quantile buckets
}): ChoroplethSpec {
  const values = Object.values(byIso3)
    .map(e => (e.value ?? 0))
    .filter(v => v > 0);
  const defaultColor = options?.defaultColor ?? '#808080';
  if (values.length === 0) {
    return { iso3ToColor: {}, legend: [], defaultColor };
  }

  // Use log transform to reduce skew, then quantile on log-values.
  const logValues = values.map(v => Math.log10(v));
  const buckets = Math.max(5, Math.min(9, options?.buckets ?? 7));
  const qs: number[] = [];
  for (let i = 1; i < buckets; i++) qs.push(i / buckets);
  const thresholdsLog = computeQuantileThresholds(logValues, qs);

  // Blue-purple palette (low=light blue, high=dark purple) for GDP per capita
  // Using a different color scheme to distinguish from GDP total
  const palette = (options?.palette && options.palette.length >= buckets)
    ? options.palette.slice(0, buckets)
    : ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#075985', '#0c4a6e'];

  const legend: Array<{ label: string; color: string; min?: number; max?: number }> = [];
  const iso3ToColor: Record<Iso3, string> = {};

  // Map each country to its bucket by log(value)
  const minLog = Math.min(...logValues);
  const thresholds = thresholdsLog.map(t => Math.pow(10, t));

  // Build legend ranges
  let prev = Math.pow(10, minLog);
  for (let i = 0; i < thresholds.length; i++) {
    const color = palette[i];
    const minV = prev;
    const maxV = thresholds[i];
    legend.push({ label: `${formatAbbrevUSD(minV)} – ${formatAbbrevUSD(maxV)}`, color, min: minV, max: maxV });
    prev = thresholds[i];
  }
  // Last bucket
  legend.push({ label: `≥ ${formatAbbrevUSD(prev)}`, color: palette[palette.length - 1], min: prev });

  // Assign colors
  for (const entry of Object.values(byIso3)) {
    const v = entry.value;
    if (!v || v <= 0) continue;
    const lv = Math.log10(v);
    let idx = thresholdsLog.findIndex(t => lv < t);
    if (idx === -1) idx = palette.length - 1;
    iso3ToColor[entry.iso3] = palette[idx];
  }

  return { iso3ToColor, legend, defaultColor };
}
















