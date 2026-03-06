// Lightweight generic fetcher for DB-backed indicators to reuse the existing choropleth builder.
// Returns a normalized map: ISO3 -> { iso3, value, year }

import type { IndicatorEntry, Iso3 } from './indicator-generic';
import { fetchIndicatorLatestByIso3 as fetchFromWorldBank } from './indicator-generic';

function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
}

export async function fetchIndicatorLatestByIso3FromDb(slug: string): Promise<Record<Iso3, IndicatorEntry>> {
  const API = getApiBaseUrl();
  const url = `${API}/api/indicators/${encodeURIComponent(slug)}/latest`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      try {
        // eslint-disable-next-line no-console
        console.error(`Indicators DB API error ${res.status}:`, await res.text());
      } catch {}
      // Fallback to World Bank when DB route is missing
      return await fetchFromWorldBankBySlug(slug);
    }
    const raw = (await res.json()) as Record<string, { value: number | null; year: number | null }>;
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<Iso3, IndicatorEntry> = {};
    for (const [iso3, e] of Object.entries(raw)) {
      if (!iso3 || iso3.length !== 3) continue;
      out[iso3.toUpperCase()] = {
        iso3: iso3.toUpperCase(),
        value: e?.value ?? null,
        year: e?.year ?? null
      };
    }
    return out;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching indicator '${slug}' from DB:`, err);
    // Network/other error → try WB fallback
    return await fetchFromWorldBankBySlug(slug);
  }
}

// Known slug -> World Bank indicator code mapping for fallback
function slugToWorldBankCode(slug: string): string | null {
  const map: Record<string, string> = {
    gini: 'SI.POV.GINI',
    exports: 'NE.EXP.GNFS.CD',
    imports: 'NE.IMP.GNFS.CD',
    unemployment: 'SL.UEM.TOTL.ZS',
    debt: 'DT.DOD.DECT.CD',
    'life-expectancy': 'SP.DYN.LE00.IN',
    'population-density': 'SP.POP.DNST',
    'military-expenditure': 'MS.MIL.XPND.GD.ZS',
    'democracy-index': 'VA.EST', // Will be normalized in frontend
    'trade-gdp': 'NE.TRD.GNFS.ZS'
  };
  return map[slug] || null;
}

async function fetchFromWorldBankBySlug(slug: string): Promise<Record<Iso3, IndicatorEntry>> {
  const code = slugToWorldBankCode(slug);
  if (!code) return {};
  try {
    return await fetchFromWorldBank(code);
  } catch {
    return {};
  }
}


