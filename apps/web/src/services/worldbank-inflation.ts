import type { ChoroplethSpec } from './worldbank-gdp';

export type Iso3 = string;

export interface InflationEntry {
  iso3: Iso3;
  value: number | null; // annual inflation, %
  year: number | null;
}

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
}

function makeCacheKey(): string {
  return 'db:inflation:latest';
}

function nowMs(): number { return Date.now(); }

function saveCache<T>(key: string, value: T, ttlMs: number = DEFAULT_CACHE_TTL_MS) {
  try { localStorage.setItem(key, JSON.stringify({ v: value, e: nowMs() + ttlMs })); } catch {}
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
  } catch { return null; }
}

export async function fetchInflationLatestByIso3(options?: {
  yearWindow?: string; // kept for backward compatibility, ignored
  cacheTtlMs?: number;
  forceRefresh?: boolean;
}): Promise<Record<Iso3, InflationEntry>> {
  const cacheKey = makeCacheKey();
  // Only clear cache when explicitly requested (forceRefresh)
  if (options?.forceRefresh) {
    try { localStorage.removeItem(cacheKey); } catch {}
  }
  const cached = loadCache<Record<Iso3, InflationEntry>>(cacheKey);
  if (cached) return cached;

  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/api/indicators/inflation/latest`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      let errorText = '';
      try { errorText = await res.text(); } catch { errorText = 'Unable to read error response'; }
      console.error(`Inflation API error ${res.status}:`, errorText);
      throw new Error(`Database Inflation API error: ${res.status} - ${errorText}`);
    }
    const data = (await res.json()) as Record<string, InflationEntry>;
    if (!data || typeof data !== 'object') return {};
    // Normalize ISO3 to uppercase
    const byIso3: Record<Iso3, InflationEntry> = {};
    for (const [iso3, entry] of Object.entries(data)) {
      if (iso3 && iso3.length === 3 && entry) {
        byIso3[iso3.toUpperCase()] = {
          iso3: iso3.toUpperCase(),
          value: entry.value ?? null,
          year: entry.year ?? null
        };
      }
    }
    const ttl = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    saveCache(cacheKey, byIso3, ttl);
    return byIso3;
  } catch (err) {
    console.error('Error fetching Inflation from database:', err);
    return {};
  }
}

function computeQuantileThresholds(values: number[], quantiles: number[]): number[] {
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  return quantiles.map(q => sorted[Math.min(n - 1, Math.max(0, Math.floor(q * (n - 1))))]);
}

export function buildInflationChoropleth(byIso3: Record<Iso3, InflationEntry>, options?: {
  palette?: string[]; // low->high (we will default to green->red)
  defaultColor?: string;
  buckets?: number;
}): ChoroplethSpec {
  const numericValues = Object.values(byIso3)
    .map(e => (e.value === null || e.value === undefined ? null : Number(e.value)))
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const defaultColor = options?.defaultColor ?? '#808080';
  if (numericValues.length === 0) {
    return { iso3ToColor: {}, legend: [], defaultColor };
  }

  const buckets = Math.max(5, Math.min(9, options?.buckets ?? 7));
  const qs: number[] = [];
  for (let i = 1; i < buckets; i++) qs.push(i / buckets);
  const thresholds = computeQuantileThresholds(numericValues, qs);

  // Pleasant teal→gold palette (colorblind-friendly-ish), low->high
  const palette = (options?.palette && options.palette.length >= buckets)
    ? options.palette.slice(0, buckets)
    : ['#0b3d3b', '#1f6f6b', '#2fa19b', '#56c9c1', '#9ddbd3', '#f2d48f', '#f2b441'];

  const legend: Array<{ label: string; color: string; min?: number; max?: number }> = [];
  const iso3ToColor: Record<Iso3, string> = {};

  let prev = Math.min(...numericValues);
  for (let i = 0; i < thresholds.length; i++) {
    const color = palette[i];
    const minV = prev;
    const maxV = thresholds[i];
    legend.push({ label: `${minV.toFixed(1)}% – ${maxV.toFixed(1)}%`, color, min: minV, max: maxV });
    prev = thresholds[i];
  }
  legend.push({ label: `≥ ${prev.toFixed(1)}%`, color: palette[palette.length - 1], min: prev });

  for (const entry of Object.values(byIso3)) {
    const v = entry.value;
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    let idx = thresholds.findIndex(t => v < t);
    if (idx === -1) idx = palette.length - 1;
    iso3ToColor[entry.iso3] = palette[idx];
  }

  return { iso3ToColor, legend, defaultColor };
}


