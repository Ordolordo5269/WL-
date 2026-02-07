// Generic World Bank indicator service and quantile choropleth builder.
// Provides:
// - fetchIndicatorLatestByIso3(code): latest non-null value per country
// - buildQuantileChoropleth(map): color buckets for arbitrary numeric indicators

import type { ChoroplethSpec } from './worldbank-gdp';

export type Iso3 = string;

export interface IndicatorEntry {
	value: number | null;
	year: number | null;
	iso3: Iso3;
}

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

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

function makeCacheKey(code: string): string {
	return `wb:indicator:${code}:latest`;
}

/**
 * Fetch latest non-null value for a World Bank indicator code across countries.
 * Returns map of ISO3 -> { iso3, value, year }.
 *
 * Example codes:
 * - 'SI.POV.GINI' (Gini index)
 * - 'NE.EXP.GNFS.CD' (Exports of goods and services, current US$)
 */
export async function fetchIndicatorLatestByIso3(
	code: string,
	options?: { cacheTtlMs?: number; forceRefresh?: boolean }
): Promise<Record<Iso3, IndicatorEntry>> {
	const cacheKey = makeCacheKey(code);
	// Only clear cache when explicitly requested (forceRefresh)
	if (options?.forceRefresh) {
		try { localStorage.removeItem(cacheKey); } catch {}
	}
	const cached = loadCache<Record<Iso3, IndicatorEntry>>(cacheKey);
	if (cached && !options?.forceRefresh) return cached;

	// World Bank API (v2). We fetch all countries for given indicator.
	const url = `https://api.worldbank.org/v2/country/all/indicator/${encodeURIComponent(code)}?format=json&per_page=20000`;
	try {
		const res = await fetch(url);
		if (!res.ok) {
			let errorText = '';
			try {
				errorText = await res.text();
			} catch {
				errorText = 'Unable to read error response';
			}
			console.error(`World Bank API error ${res.status}:`, errorText);
			return {};
		}
		const data = (await res.json()) as any;
		const rows: any[] = Array.isArray(data?.[1]) ? data[1] : [];

		// Track latest non-null per iso3
		const latestByIso3: Record<Iso3, IndicatorEntry> = {};
		for (const r of rows) {
			const iso3: string | undefined = r?.countryiso3code || r?.country?.id;
			if (!iso3 || iso3.length !== 3) continue;
			const value = r?.value;
			const yearNum = typeof r?.date === 'string' ? parseInt(r.date, 10) : Number(r?.date);
			const year = Number.isFinite(yearNum) ? yearNum : null;
			if (value === null || value === undefined) continue;
			const numericValue = Number(value);
			if (!Number.isFinite(numericValue)) continue;

			const key = iso3.toUpperCase();
			const existing = latestByIso3[key];
			if (!existing || (year !== null && (existing.year === null || year > existing.year))) {
				latestByIso3[key] = { iso3: key, value: numericValue, year };
			}
		}

		const ttl = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
		saveCache(cacheKey, latestByIso3, ttl);
		return latestByIso3;
	} catch (err) {
		console.error(`Error fetching World Bank indicator ${code}:`, err);
		return {};
	}
}

function computeQuantileThresholds(values: number[], quantiles: number[]): number[] {
	const sorted = values.slice().sort((a, b) => a - b);
	const n = sorted.length;
	return quantiles.map(q => sorted[Math.min(n - 1, Math.max(0, Math.floor(q * (n - 1))))]);
}

/**
 * Build a generic quantile-based choropleth from a map of latest indicator values.
 *
 * Options:
 * - palette: low->high colors (defaults to a purple palette)
 * - defaultColor: color for missing values
 * - buckets: number of quantile buckets (5..9, default 7)
 * - useLog: apply log10 before bucketing (useful for skewed $ metrics)
 * - formatter: legend number formatter
 */
export function buildQuantileChoropleth(
	byIso3: Record<Iso3, { value: number | null }>,
	options?: {
		palette?: string[];
		defaultColor?: string;
		buckets?: number;
		useLog?: boolean;
		formatter?: (v: number) => string;
	}
): ChoroplethSpec {
	const rawValues = Object.values(byIso3)
		.map(e => (e.value === null || e.value === undefined ? null : Number(e.value)))
		.filter((v): v is number => v !== null && Number.isFinite(v));
	const defaultColor = options?.defaultColor ?? '#808080';
	if (rawValues.length === 0) {
		return { iso3ToColor: {}, legend: [], defaultColor };
	}

	const buckets = Math.max(5, Math.min(9, options?.buckets ?? 7));
	const useLog = options?.useLog === true;
	const values = useLog ? rawValues.map(v => Math.log10(Math.max(v, 1e-12))) : rawValues.slice();

	const qs: number[] = [];
	for (let i = 1; i < buckets; i++) qs.push(i / buckets);
	const thresholds = computeQuantileThresholds(values, qs);

	const defaultPalette = ['#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#7e22ce', '#581c87'];
	const palette =
		options?.palette && options.palette.length >= buckets
			? options.palette.slice(0, buckets)
			: defaultPalette.slice(0, buckets);

	const legend: Array<{ label: string; color: string; min?: number; max?: number }> = [];
	const iso3ToColor: Record<Iso3, string> = {};

	// Build legend on original scale if log was used
	const toDisplay = (v: number) => (useLog ? Math.pow(10, v) : v);
	const fmt = options?.formatter ?? ((v: number) => v.toFixed(1));

	let prev = Math.min(...values);
	for (let i = 0; i < thresholds.length; i++) {
		const color = palette[i];
		const minV = prev;
	 const maxV = thresholds[i];
		legend.push({ label: `${fmt(toDisplay(minV))} – ${fmt(toDisplay(maxV))}`, color, min: toDisplay(minV), max: toDisplay(maxV) });
		prev = thresholds[i];
	}
	legend.push({ label: `≥ ${fmt(toDisplay(prev))}`, color: palette[palette.length - 1], min: toDisplay(prev) });

	// Assign colors
	for (const [iso3, entry] of Object.entries(byIso3)) {
		const v = entry?.value;
		if (v === null || v === undefined || !Number.isFinite(Number(v))) continue;
		const metric = useLog ? Math.log10(Math.max(Number(v), 1e-12)) : Number(v);
		let idx = thresholds.findIndex(t => metric < t);
		if (idx === -1) idx = palette.length - 1;
		iso3ToColor[iso3] = palette[idx];
	}

	return { iso3ToColor, legend, defaultColor };
}














