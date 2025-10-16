import type { ChoroplethSpec } from './worldbank-gdp';

export type Iso3 = string;

export interface InflationEntry {
  iso3: Iso3;
  value: number | null; // annual inflation, %
  year: number | null;
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
const INDICATOR = 'FP.CPI.TOTL.ZG'; // Inflation, consumer prices (annual %)
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function makeCacheKey(yearWindow: string): string {
  return `wb:inflation:${INDICATOR}:${yearWindow}`;
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

function isAggregateRegion(row: any): boolean {
  const iso3 = (row?.countryiso3code || '').trim();
  if (!iso3 || iso3.length !== 3) return true;
  const regionId = row?.region?.id || '';
  if (typeof regionId === 'string' && /aggregates/i.test(regionId)) return true;
  return false;
}

export async function fetchInflationLatestByIso3(options?: {
  yearWindow?: string; // e.g., '1960:2050'
  cacheTtlMs?: number;
}): Promise<Record<Iso3, InflationEntry>> {
  const yearWindow = options?.yearWindow ?? '1960:2050';
  const cacheKey = makeCacheKey(yearWindow);
  const cached = loadCache<Record<Iso3, InflationEntry>>(cacheKey);
  if (cached) return cached;

  const url = `${WB_BASE}/country/all/indicator/${encodeURIComponent(INDICATOR)}?format=json&per_page=20000&date=${encodeURIComponent(yearWindow)}`;
  let data: WorldBankIndicatorResponse | null = null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WorldBank inflation error: ${res.status}`);
    data = (await res.json()) as WorldBankIndicatorResponse;
  } catch {
    return {};
  }

  const rows = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
  const byIso3: Record<Iso3, InflationEntry> = {};
  for (const row of rows) {
    if (isAggregateRegion(row)) continue;
    const iso3 = String(row.countryiso3code || '').toUpperCase();
    if (!iso3 || iso3.length !== 3) continue;
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


