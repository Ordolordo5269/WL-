import type { MetricId } from '../types';
import { fetchGdpLatestByIso3, buildGdpChoropleth } from './worldbank-gdp';
import { fetchGdpPerCapitaLatestByIso3, buildGdpPerCapitaChoropleth } from './worldbank-gdp-per-capita';
import { fetchInflationLatestByIso3, buildInflationChoropleth } from './worldbank-inflation';

export type IndicatorCategory = 'Economy' | 'Social' | 'Trade' | 'Raw Materials' | 'Security';

export interface IndicatorConfig {
  id: MetricId;
  slug: string;
  name: string;
  description: string;
  category: IndicatorCategory;
  sourceCode: string;
  palette: string[];
  accentColor: string;
  useLog: boolean;
  formatter: (v: number) => string;
  customFetch?: () => Promise<Record<string, { iso3: string; value: number | null; year: number | null }>>;
  customBuild?: (byIso3: Record<string, any>, opts: { buckets: number }) => any;
  transformData?: (byIso3: Record<string, any>) => Record<string, any>;
}

const fmtCurrency = (v: number): string => {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
};

const fmtPercent1 = (v: number) => `${v.toFixed(1)}%`;
const fmtPercent2 = (v: number) => `${v.toFixed(2)}%`;
const fmtFixed1 = (v: number) => v.toFixed(1);
const fmtLifeExp = (v: number) => `${v.toFixed(1)} yrs`;
const fmtTonnes = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
};

const normalizeDemocracy = (byIso3Raw: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  Object.entries(byIso3Raw).forEach(([iso, entry]) => {
    if (entry.value !== null) {
      const normalized = ((entry.value + 2.5) / 5) * 10;
      result[iso] = { ...entry, value: Number(Math.max(0, Math.min(10, normalized)).toFixed(2)) };
    } else {
      result[iso] = entry;
    }
  });
  return result;
};

export const INDICATOR_CONFIGS: IndicatorConfig[] = [
  // Economy
  { id: 'gdp', slug: 'gdp', name: 'GDP (nominal)', description: 'Current US$, latest available year · log scale', category: 'Economy', sourceCode: 'NY.GDP.MKTP.CD', palette: [], accentColor: '#6366f1', useLog: true, formatter: fmtCurrency, customFetch: fetchGdpLatestByIso3, customBuild: buildGdpChoropleth },
  { id: 'gdp-per-capita', slug: 'gdp-per-capita', name: 'GDP per Capita', description: 'Current US$, latest available year · log scale', category: 'Economy', sourceCode: 'NY.GDP.PCAP.CD', palette: [], accentColor: '#6366f1', useLog: true, formatter: fmtCurrency, customFetch: fetchGdpPerCapitaLatestByIso3, customBuild: buildGdpPerCapitaChoropleth },
  { id: 'inflation', slug: 'inflation', name: 'Inflation (annual %)', description: 'Consumer prices (annual %), latest available year', category: 'Economy', sourceCode: 'FP.CPI.TOTL.ZG', palette: [], accentColor: '#6366f1', useLog: false, formatter: fmtPercent1, customFetch: () => fetchInflationLatestByIso3({ yearWindow: '1960:2050' }), customBuild: buildInflationChoropleth },
  // Social
  { id: 'gini', slug: 'gini', name: 'GINI Index', description: 'Latest available value (0–100) · quantiles', category: 'Social', sourceCode: 'SI.POV.GINI', palette: ['#16a34a', '#4ade80', '#86efac', '#fca5a5', '#f87171', '#ef4444', '#dc2626'], accentColor: '#16a34a', useLog: false, formatter: fmtFixed1 },
  { id: 'life-expectancy', slug: 'life-expectancy', name: 'Life Expectancy', description: 'Years, latest available', category: 'Social', sourceCode: 'SP.DYN.LE00.IN', palette: ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'], accentColor: '#22c55e', useLog: false, formatter: fmtLifeExp },
  { id: 'democracy-index', slug: 'democracy-index', name: 'Democracy Index', description: 'WGI Voice & Accountability (0-10 scale)', category: 'Social', sourceCode: 'VA.EST', palette: ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#86efac', '#4ade80', '#16a34a'], accentColor: '#4ade80', useLog: false, formatter: fmtFixed1, transformData: normalizeDemocracy },
  // Trade
  { id: 'exports', slug: 'exports', name: 'Exports (US$)', description: 'Current US$, latest available year · log scale', category: 'Trade', sourceCode: 'NE.EXP.GNFS.CD', palette: ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#6366f1', '#4f46e5'], accentColor: '#3b82f6', useLog: true, formatter: fmtCurrency },
  { id: 'trade-gdp', slug: 'trade-gdp', name: 'Trade (% of GDP)', description: 'Trade openness, latest available', category: 'Trade', sourceCode: 'NE.TRD.GNFS.ZS', palette: ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#06b6d4', '#0891b2'], accentColor: '#0ea5e9', useLog: false, formatter: fmtPercent1 },
  // Raw Materials
  { id: 'fuel-exports', slug: 'fuel-exports', name: 'Fuel Exports (% merch.)', description: 'Fuel exports as % of merchandise exports', category: 'Raw Materials', sourceCode: 'TX.VAL.FUEL.ZS.UN', palette: ['#fffbeb', '#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#92400e'], accentColor: '#f59e0b', useLog: false, formatter: fmtPercent1 },
  { id: 'mineral-rents', slug: 'mineral-rents', name: 'Mineral Rents (% GDP)', description: 'Mineral rents as % of GDP', category: 'Raw Materials', sourceCode: 'NY.GDP.MINR.RT.ZS', palette: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#6d28d9'], accentColor: '#8b5cf6', useLog: false, formatter: fmtPercent2 },
  { id: 'energy-imports', slug: 'energy-imports', name: 'Energy Imports (% use)', description: 'Net energy imports as % of energy use', category: 'Raw Materials', sourceCode: 'EG.IMP.CONS.ZS', palette: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#c2410c'], accentColor: '#f97316', useLog: false, formatter: fmtPercent1 },
  { id: 'cereal-production', slug: 'cereal-production', name: 'Cereal Production', description: 'Total cereal production (metric tons) · log scale', category: 'Raw Materials', sourceCode: 'AG.PRD.CREL.MT', palette: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#16a34a', '#166534'], accentColor: '#16a34a', useLog: true, formatter: fmtTonnes },
  // Security
  { id: 'military-expenditure', slug: 'military-expenditure', name: 'Military Expenditure (% GDP)', description: '% of GDP, latest available', category: 'Security', sourceCode: 'MS.MIL.XPND.GD.ZS', palette: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c'], accentColor: '#f97316', useLog: false, formatter: fmtPercent2 },
];

export const INDICATOR_BY_ID = new Map(INDICATOR_CONFIGS.map(c => [c.id, c]));

export const CATEGORIES: IndicatorCategory[] = ['Economy', 'Social', 'Trade', 'Raw Materials', 'Security'];
