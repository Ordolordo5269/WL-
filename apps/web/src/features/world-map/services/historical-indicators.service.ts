export interface TimeSeriesPoint {
  year: number;
  value: number | null;
}

class HistoricalIndicatorsService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  /**
   * Fetch time series for a specific indicator and country
   */
  async getTimeSeries(
    slug: string,
    iso3: string,
    startYear?: number,
    endYear?: number
  ): Promise<TimeSeriesPoint[]> {
    const apiBaseUrl = this.getApiBaseUrl();
    const params = new URLSearchParams();
    if (startYear) params.append('startYear', startYear.toString());
    if (endYear) params.append('endYear', endYear.toString());

    const url = `${apiBaseUrl}/api/indicators/${encodeURIComponent(slug)}/timeseries/${encodeURIComponent(iso3.toUpperCase())}${params.toString() ? `?${params.toString()}` : ''}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json() as TimeSeriesPoint[];
      return data;
    } catch (error) {
      console.error(`Error fetching time series for ${slug} (${iso3}):`, error);
      return [];
    }
  }

  /**
   * Format value for display based on indicator type
   */
  formatValue(value: number | null, indicatorSlug: string): string {
    if (value === null || value === undefined) return 'N/A';

    const currencyIndicators = [
      'gdp', 'gdp-per-capita', 'gni-per-capita-ppp', 'exports', 'imports', 'debt',
      'total-reserves', 'military-expenditure-usd', 'oda-received', 'current-account',
      'fdi-inflows', 'fdi-outflows', 'remittances', 'high-tech-exports'
    ];

    const percentageIndicators = [
      'inflation', 'unemployment', 'gdp-growth', 'govt-debt', 'tax-revenue',
      'gross-savings', 'gross-capital-formation', 'fdi-inflows-pct-gdp',
      'remittances-pct-gdp', 'manufacturing', 'military-expenditure-pct-gdp',
      'trade-percent-gdp', 'oda-given', 'youth-unemployment',
      'forest-area', 'renewable-energy', 'clean-water', 'renewable-electricity',
      'protected-areas', 'rnd-expenditure', 'high-tech-exports-pct',
      'energy-imports', 'fuel-exports', 'fuel-imports', 'electricity-renewables',
      'mineral-rents', 'ore-metal-exports', 'food-exports', 'food-imports',
      'arable-land', 'natural-gas-rents', 'oil-rents', 'forest-rents',
      'population-growth', 'urban-population', 'rural-population',
      'literacy', 'primary-enrollment', 'poverty'
    ];

    const indexIndicators = [
      'gini', 'political-stability', 'voice-accountability',
      'government-effectiveness', 'regulatory-quality', 'rule-of-law',
      'control-of-corruption', 'logistics-index', 'uhc-coverage'
    ];

    if (currencyIndicators.includes(indicatorSlug)) {
      if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
      return `$${value.toFixed(2)}`;
    }

    if (percentageIndicators.includes(indicatorSlug)) {
      return `${value.toFixed(2)}%`;
    }

    if (indexIndicators.includes(indicatorSlug)) {
      return value.toFixed(2);
    }

    return value.toLocaleString();
  }

  /**
   * Get indicator display name
   */
  getIndicatorName(slug: string): string {
    const names: Record<string, string> = {
      // Economy
      'gdp': 'GDP (USD)',
      'gdp-per-capita': 'GDP per Capita (USD)',
      'gdp-growth': 'GDP Growth (annual %)',
      'gni-per-capita-ppp': 'GNI per Capita PPP (intl $)',
      'inflation': 'Inflation (%)',
      'gini': 'GINI Index',
      'exports': 'Exports (USD)',
      'imports': 'Imports (USD)',
      'unemployment': 'Unemployment Rate (%)',
      'debt': 'External Debt (USD)',
      'govt-debt': 'Government Debt (% GDP)',
      'tax-revenue': 'Tax Revenue (% GDP)',
      'gross-savings': 'Gross Savings (% GDP)',
      'total-reserves': 'Total Reserves incl. Gold (USD)',
      'gross-capital-formation': 'Capital Formation (% GDP)',
      'fdi-inflows-pct-gdp': 'FDI Inflows (% GDP)',
      'remittances-pct-gdp': 'Remittances Received (% GDP)',
      'manufacturing': 'Manufacturing (% GDP)',
      // Society
      'life-expectancy': 'Life Expectancy (years)',
      'literacy': 'Adult Literacy (%)',
      'uhc-coverage': 'UHC Coverage Index',
      'population-growth': 'Population Growth (%)',
      'population-density': 'Population Density (per km²)',
      'birth-rate': 'Birth Rate (per 1,000)',
      'death-rate': 'Death Rate (per 1,000)',
      'urban-population': 'Urban Population (%)',
      'rural-population': 'Rural Population (%)',
      'primary-enrollment': 'Primary Net Enrollment (%)',
      'poverty': 'Extreme Poverty — $2.15/day (%)',
      'youth-unemployment': 'Youth Unemployment 15-24 (%)',
      'homicides': 'Intentional Homicides (per 100k)',
      // Politics
      'political-stability': 'Political Stability (index)',
      'voice-accountability': 'Voice & Accountability (index)',
      'government-effectiveness': 'Government Effectiveness (index)',
      'regulatory-quality': 'Regulatory Quality (index)',
      'rule-of-law': 'Rule of Law (index)',
      'control-of-corruption': 'Control of Corruption (index)',
      // Defense
      'military-expenditure-pct-gdp': 'Military Expenditure (% GDP)',
      'military-expenditure-usd': 'Military Expenditure (USD)',
      'armed-forces-personnel': 'Armed Forces Personnel',
      'arms-imports': 'Arms Imports (TIV)',
      'arms-exports': 'Arms Exports (TIV)',
      'battle-deaths': 'Battle-Related Deaths',
      // International
      'oda-received': 'ODA Received (USD)',
      'trade-percent-gdp': 'Trade (% GDP)',
      'current-account': 'Current Account (USD)',
      'fdi-inflows': 'FDI Net Inflows (USD)',
      'fdi-outflows': 'FDI Net Outflows (USD)',
      'remittances': 'Remittances (USD)',
      'refugees-origin': 'Refugees by Country of Origin',
      'refugees-asylum': 'Refugees by Country of Asylum',
      'logistics-index': 'Logistics Performance Index',
      'oda-given': 'ODA Given (% GNI)',
      // Technology
      'rnd-expenditure': 'R&D Expenditure (% GDP)',
      'high-tech-exports': 'High-Tech Exports (USD)',
      'researchers': 'Researchers (per million)',
      'patents': 'Patent Applications (residents)',
      'journal-articles': 'Scientific Journal Articles',
      'broadband': 'Fixed Broadband (per 100 people)',
      'high-tech-exports-pct': 'High-Tech Exports (% manufactured)',
      // Raw Materials / Commodities
      'energy-imports': 'Energy Imports (% of use)',
      'fuel-exports': 'Fuel Exports (% merchandise)',
      'fuel-imports': 'Fuel Imports (% merchandise)',
      'energy-use-per-capita': 'Energy Use (kg oil eq per capita)',
      'electricity-renewables': 'Electricity from Renewables (%)',
      'mineral-rents': 'Mineral Rents (% GDP)',
      'ore-metal-exports': 'Ore & Metal Exports (%)',
      'cereal-production': 'Cereal Production (metric tons)',
      'cereal-yield': 'Cereal Yield (kg per hectare)',
      'food-exports': 'Food Exports (%)',
      'food-imports': 'Food Imports (%)',
      'arable-land': 'Arable Land (% of land)',
      'electric-power-consumption': 'Electric Power (kWh per capita)',
      'natural-gas-rents': 'Natural Gas Rents (% GDP)',
      'oil-rents': 'Oil Rents (% GDP)',
      // Environment
      'co2-per-capita': 'CO2 per Capita (metric tons)',
      'co2-total': 'CO2 Emissions Total (Mt)',
      'forest-area': 'Forest Area (% of land)',
      'pm25': 'PM2.5 Air Pollution (µg/m³)',
      'renewable-energy': 'Renewable Energy (% total)',
      'clean-water': 'Clean Water Access (%)',
      'renewable-electricity': 'Renewable Electricity (%)',
      'co2-electricity': 'CO2 from Power Industry (Mt)',
      'protected-areas': 'Terrestrial Protected Areas (%)',
      'methane-emissions': 'Methane Emissions (Mt CO2e)',
      'forest-rents': 'Forest Rents (% GDP)',
    };
    return names[slug] || slug;
  }
}

export const historicalIndicatorsService = new HistoricalIndicatorsService();
