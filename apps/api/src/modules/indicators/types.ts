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
  // Raw Materials / Commodities
  'energy-imports': 'ENERGY_IMPORTS_PCT',
  'fuel-exports': 'FUEL_EXPORTS_PCT_MERCH',
  'fuel-imports': 'FUEL_IMPORTS_PCT_MERCH',
  'energy-use-per-capita': 'ENERGY_USE_KG_OIL_EQ_PC',
  'electricity-renewables': 'ELECTRICITY_RENEWABLES_PCT',
  'mineral-rents': 'MINERAL_RENTS_PCT_GDP',
  'ore-metal-exports': 'ORE_METAL_EXPORTS_PCT',
  'cereal-production': 'CEREAL_PRODUCTION_MT',
  'cereal-yield': 'CEREAL_YIELD_KG_HA',
  'food-exports': 'FOOD_EXPORTS_PCT',
  'food-imports': 'FOOD_IMPORTS_PCT',
  'arable-land': 'ARABLE_LAND_PCT',
  // Economy (expansion)
  'govt-debt': 'GOVT_DEBT_PCT_GDP',
  'tax-revenue': 'TAX_REVENUE_PCT_GDP',
  'gross-savings': 'GROSS_SAVINGS_PCT_GDP',
  'total-reserves': 'TOTAL_RESERVES_USD',
  'gross-capital-formation': 'GROSS_CAPITAL_FORMATION_PCT_GDP',
  'gdp-growth': 'GDP_GROWTH_ANNUAL_PCT',
  'gni-per-capita-ppp': 'GNI_PER_CAPITA_PPP',
  'fdi-inflows-pct-gdp': 'FDI_NET_INFLOWS_PCT_GDP',
  'remittances-pct-gdp': 'REMITTANCES_RECEIVED_PCT_GDP',
  'manufacturing': 'MANUFACTURING_VALUE_ADDED_PCT_GDP',
  // Environment
  'co2-per-capita': 'CO2_EMISSIONS_PER_CAPITA',
  'co2-total': 'CO2_EMISSIONS_TOTAL_KT',
  'forest-area': 'FOREST_AREA_PCT',
  'pm25': 'PM25_AIR_POLLUTION',
  'renewable-energy': 'RENEWABLE_ENERGY_CONSUMPTION_PCT',
  'clean-water': 'ACCESS_CLEAN_WATER_PCT',
  'renewable-electricity': 'RENEWABLE_ELECTRICITY_OUTPUT_PCT',
  'co2-electricity': 'CO2_FROM_ELECTRICITY_PCT',
  'protected-areas': 'TERRESTRIAL_PROTECTED_AREAS_PCT',
  'methane-emissions': 'METHANE_EMISSIONS_KT_CO2EQ',
  'forest-rents': 'FOREST_RENTS_PCT_GDP',
  // Society
  'literacy': 'LITERACY_RATE_ADULT',
  'uhc-coverage': 'UHC_SERVICE_COVERAGE_INDEX',
  'population-total': 'POPULATION_TOTAL',
  'birth-rate': 'CRUDE_BIRTH_RATE',
  'death-rate': 'CRUDE_DEATH_RATE',
  'urban-population': 'URBAN_POPULATION_PERCENT',
  'rural-population': 'RURAL_POPULATION_PERCENT',
  'primary-enrollment': 'PRIMARY_NET_ENROLLMENT',
  'poverty': 'POVERTY_EXTREME_215',
  'youth-unemployment': 'YOUTH_UNEMPLOYMENT_PCT',
  'homicides': 'INTENTIONAL_HOMICIDES_PER_100K',
  // International (expansion)
  'refugees-origin': 'REFUGEE_POP_BY_ORIGIN',
  'refugees-asylum': 'REFUGEE_POP_BY_ASYLUM',
  'logistics-index': 'LOGISTICS_PERFORMANCE_INDEX',
  'oda-given': 'ODA_GIVEN_PCT_GNI',
  // Technology
  'rnd-expenditure': 'RND_EXPENDITURE_PCT_GDP',
  'high-tech-exports': 'HIGH_TECH_EXPORTS_USD',
  'researchers': 'RESEARCHERS_PER_MILLION',
  'patents': 'PATENT_APPLICATIONS_RESIDENTS',
  'journal-articles': 'SCIENTIFIC_JOURNAL_ARTICLES',
  'broadband': 'FIXED_BROADBAND_PER_100',
  'high-tech-exports-pct': 'HIGH_TECH_EXPORTS_PCT_MANUF',
  // Politics (expansion)
  'statistical-capacity': 'STATISTICAL_CAPACITY',
  // Raw Materials (expansion)
  'electric-power-consumption': 'ELECTRIC_POWER_CONSUMPTION_KWH_PC',
  'natural-gas-rents': 'NATURAL_GAS_RENTS_PCT_GDP',
  'oil-rents': 'OIL_RENTS_PCT_GDP',
  // Health
  'health-expenditure': 'HEALTH_EXPENDITURE_PCT_GDP',
  'physicians': 'PHYSICIANS_PER_1000',
  'hospital-beds': 'HOSPITAL_BEDS_PER_1000',
  'infant-mortality': 'MORTALITY_RATE_INFANT',
  'maternal-mortality': 'MORTALITY_RATE_MATERNAL',
  'immunization-measles': 'IMMUNIZATION_MEASLES',
  'undernourishment': 'PREVALENCE_OF_UNDERNOURISHMENT',
  // Education (expansion of Society)
  'education-expenditure': 'EDUCATION_EXPENDITURE_PCT_GDP',
  'secondary-enrollment': 'SECONDARY_NET_ENROLLMENT',
  'tertiary-enrollment': 'TERTIARY_GROSS_ENROLLMENT',
  'pupil-teacher-ratio': 'PRIMARY_PUPIL_TEACHER_RATIO',
  'out-of-school': 'OUT_OF_SCHOOL_CHILDREN_PRIMARY',
  // Infrastructure & Connectivity
  'internet-users': 'INTERNET_USERS',
  'mobile-subscriptions': 'MOBILE_CELLULAR_SUBSCRIPTIONS',
  'access-electricity': 'ACCESS_TO_ELECTRICITY',
  'air-transport': 'AIR_TRANSPORT_PASSENGERS',
  'secure-servers': 'SECURE_INTERNET_SERVERS_PER_MILLION',
  // Geopolitical expansion — Economy
  'gdp-ppp': 'GDP_PPP_USD',
  'gdp-per-capita-ppp': 'GDP_PC_PPP_USD',
  'exchange-rate': 'EXCHANGE_RATE_LCU_PER_USD',
  'labor-force': 'LABOR_FORCE_TOTAL',
  'govt-revenue': 'GOVT_REVENUE_PCT_GDP',
  'govt-expenditure': 'GOVT_EXPENDITURE_PCT_GDP',
  // Geopolitical expansion — Environment
  'ghg-emissions-total': 'GHG_EMISSIONS_TOTAL_KT',
  'fossil-fuel-consumption': 'FOSSIL_FUEL_CONSUMPTION_PCT',
  'land-area': 'LAND_AREA_SQ_KM',
  // Geopolitical expansion — Infrastructure
  'rail-lines': 'RAIL_LINES_TOTAL_KM',
  'roads-paved': 'ROADS_PAVED_PCT',
  'container-port-traffic': 'CONTAINER_PORT_TRAFFIC_TEU',
  'air-departures': 'AIR_TRANSPORT_DEPARTURES',
  'air-freight': 'AIR_FREIGHT_MILLION_TON_KM',
  'electricity-losses': 'ELECTRICITY_TRANSMISSION_LOSSES_PCT',
  'electricity-from-oil': 'ELECTRICITY_FROM_OIL_PCT',
  // Geopolitical expansion — Defense
  'armed-forces-pct-labor': 'ARMED_FORCES_PCT_LABOR_FORCE',
  'military-expenditure-pct-govt': 'MILITARY_EXPENDITURE_PCT_GOVT',
  // Geopolitical expansion — International
  'merchandise-exports': 'MERCHANDISE_EXPORTS_USD',
  'merchandise-imports': 'MERCHANDISE_IMPORTS_USD',
  'natural-resource-rents': 'TOTAL_NATURAL_RESOURCE_RENTS_PCT_GDP',
  // Geopolitical expansion — Technology
  'patents-nonresidents': 'PATENT_APPLICATIONS_NONRESIDENTS',
  'trademarks': 'TRADEMARK_APPLICATIONS_RESIDENTS',
  // Geopolitical expansion — Society
  'suicide-rate': 'SUICIDE_MORTALITY_RATE',
  'noncommunicable-deaths': 'CAUSE_OF_DEATH_NONCOMMUNICABLE_PCT',
  // Final geopolitical indicators
  'external-debt-pct-gni': 'EXTERNAL_DEBT_PCT_GNI',
  'food-production-index': 'FOOD_PRODUCTION_INDEX',
};

export function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
