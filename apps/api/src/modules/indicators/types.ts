export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface GdpEntry {
  iso3: string;
  value: number | null;
  year: number | null;
}

/** Combined slug-to-code mapping for all indicator categories */
export const SLUG_TO_CODE: Record<string, string> = {
  // Economy
  'gdp': 'GDP_USD',
  'gdp-per-capita': 'GDP_PC_USD',
  'inflation': 'INFLATION_CPI_YOY_PCT',
  'gini': 'GINI_INDEX',
  'exports': 'EXPORTS_USD',
  'imports': 'IMPORTS_USD',
  'unemployment': 'UNEMPLOYMENT_RATE_PERCENT',
  'debt': 'EXTERNAL_DEBT_USD',
  'population-growth': 'POPULATION_GROWTH',
  // Statistics panel
  'life-expectancy': 'LIFE_EXPECTANCY',
  'population-density': 'POPULATION_DENSITY',
  'military-expenditure': 'MILITARY_EXPENDITURE_PCT_GDP',
  'democracy-index': 'WGI_VOICE_ACCOUNTABILITY',
  'trade-gdp': 'TRADE_PERCENT_GDP',
  // Politics (WGI)
  'political-stability': 'WGI_POLITICAL_STABILITY',
  'voice-accountability': 'WGI_VOICE_ACCOUNTABILITY',
  'government-effectiveness': 'WGI_GOVERNMENT_EFFECTIVENESS',
  'regulatory-quality': 'WGI_REGULATORY_QUALITY',
  'rule-of-law': 'WGI_RULE_OF_LAW',
  'control-of-corruption': 'WGI_CONTROL_CORRUPTION',
  // Defense
  'military-expenditure-pct-gdp': 'MILITARY_EXPENDITURE_PCT_GDP',
  'military-expenditure-usd': 'MILITARY_EXPENDITURE_USD',
  'armed-forces-personnel': 'ARMED_FORCES_PERSONNEL_TOTAL',
  'arms-imports': 'ARMS_IMPORTS_TIV',
  'arms-exports': 'ARMS_EXPORTS_TIV',
  'battle-deaths': 'BATTLE_RELATED_DEATHS',
  // International
  'oda-received': 'ODA_RECEIVED_USD',
  'trade-percent-gdp': 'TRADE_PERCENT_GDP',
  'current-account': 'CURRENT_ACCOUNT_USD',
  'fdi-inflows': 'FDI_NET_INFLOWS_USD',
  'fdi-outflows': 'FDI_NET_OUTFLOWS_USD',
  'remittances': 'REMITTANCES_USD',
};

export function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
