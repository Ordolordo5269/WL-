// Data service to fetch World Bank GDP (NY.GDP.MKTP.CD) in bulk, cache it,
// compute quantile buckets, and build a Mapbox match expression to color countries.

export type Iso3 = string;

export interface GdpEntry {
  iso3: Iso3;
  value: number | null;
  year: number | null;
}

export interface ChoroplethSpec {
  iso3ToColor: Record<Iso3, string>;
  legend: Array<{ label: string; color: string; min?: number; max?: number }>;
  defaultColor: string;
}

type WorldBankIndicatorResponse = [
  unknown,
  Array<{
    countryiso3code: string | null;
    date: string;
    value: number | null;
    region?: { id?: string };
  }>
];

const WB_BASE = 'https://api.worldbank.org/v2';
const INDICATOR = 'NY.GDP.MKTP.CD'; // GDP (current US$)
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function makeCacheKey(yearWindow: string): string {
  return `wb:gdp:${INDICATOR}:${yearWindow}`;
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

function isAggregateRegion(row: any): boolean {
  // World Bank aggregates often have region.id === 'NA' or 'Aggregates', and iso3 is null/''.
  const iso3 = (row?.countryiso3code || '').trim();
  if (!iso3 || iso3.length !== 3) return true;
  const regionId = row?.region?.id || '';
  if (typeof regionId === 'string' && /aggregates/i.test(regionId)) return true;
  return false;
}

export async function fetchGdpLatestByIso3(options?: {
  // e.g., '1960:2050' to maximize fallback coverage.
  yearWindow?: string;
  cacheTtlMs?: number;
}): Promise<Record<Iso3, GdpEntry>> {
  const yearWindow = options?.yearWindow ?? '1960:2050';
  const cacheKey = makeCacheKey(yearWindow);
  const cached = loadCache<Record<Iso3, GdpEntry>>(cacheKey);
  if (cached) return cached;

  const url = `${WB_BASE}/country/all/indicator/${encodeURIComponent(INDICATOR)}?format=json&per_page=20000&date=${encodeURIComponent(yearWindow)}`;
  let data: WorldBankIndicatorResponse | null = null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WorldBank GDP error: ${res.status}`);
    data = (await res.json()) as WorldBankIndicatorResponse;
  } catch (err) {
    // On failure, return empty map; caller can handle gracefully.
    return {};
  }

  const rows = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
  const byIso3: Record<Iso3, GdpEntry> = {};
  for (const row of rows) {
    if (isAggregateRegion(row)) continue;
    // Normalize ISO3 and fix common edge cases
    let iso3 = String(row.countryiso3code || '').toUpperCase();
    if (!iso3 || iso3.length !== 3) continue;
    // Kosovo mapping: WB uses XKX, mapbox sometimes has XKX; keep XKX
    // Côte d'Ivoire often appears as CIV; ensure uppercase is kept
    const yearNum = Number(row.date);
    const value = row.value === null ? null : Number(row.value);
    const prev = byIso3[iso3];
    if (!prev) {
      byIso3[iso3] = { iso3, value, year: Number.isFinite(yearNum) ? yearNum : null };
    } else {
      if (value !== null && (prev.year === null || (Number.isFinite(yearNum) && yearNum > (prev.year ?? -Infinity)))) {
        byIso3[iso3] = { iso3, value, year: Number.isFinite(yearNum) ? yearNum : prev.year };
      }
    }
  }

  saveCache(cacheKey, byIso3, options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
  return byIso3;
}

function computeQuantileThresholds(values: number[], quantiles: number[]): number[] {
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  return quantiles.map(q => sorted[Math.min(n - 1, Math.max(0, Math.floor(q * (n - 1))))]);
}

function formatAbbrevUSD(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function buildGdpChoropleth(byIso3: Record<Iso3, GdpEntry>, options?: {
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

  // Classic RdYlGn (low=red, high=green) 7-step for GDP totals
  const palette = (options?.palette && options.palette.length >= buckets)
    ? options.palette.slice(0, buckets)
    : ['#b10026', '#e31a1c', '#fd8d3c', '#feb24c', '#fed976', '#78c679', '#006837'];

  const legend: Array<{ label: string; color: string; min?: number; max?: number }> = [];
  const iso3ToColor: Record<Iso3, string> = {};

  // Map each country to its bucket by log(value)
  const minLog = Math.min(...logValues);
  const maxLog = Math.max(...logValues);
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

export function buildMatchColorExpression(property: string, mapping: Record<Iso3, string>, defaultColor: string): any[] {
  const expr: any[] = ['match', ['get', property]];
  for (const [iso3, color] of Object.entries(mapping)) {
    expr.push(iso3, color);
  }
  expr.push(defaultColor);
  return expr;
}


