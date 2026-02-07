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
   * @param slug Indicator slug (gdp, gdp-per-capita, inflation, gini, exports, imports, unemployment, debt)
   * @param iso3 ISO3 country code
   * @param startYear Optional start year filter
   * @param endYear Optional end year filter
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
    
    // Currency indicators
    const currencyIndicators = [
      'gdp', 'gdp-per-capita', 'exports', 'imports', 'debt',
      'military-expenditure-usd', 'oda-received', 'current-account',
      'fdi-inflows', 'fdi-outflows', 'remittances'
    ];
    
    // Percentage indicators
    const percentageIndicators = [
      'inflation', 'unemployment', 'military-expenditure-pct-gdp',
      'trade-percent-gdp'
    ];
    
    // Index indicators (WGI)
    const indexIndicators = [
      'gini', 'political-stability', 'voice-accountability',
      'government-effectiveness', 'regulatory-quality', 'rule-of-law',
      'control-of-corruption'
    ];
    
    if (currencyIndicators.includes(indicatorSlug)) {
      // Currency formatting
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
    
    // Default: number formatting
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
      'inflation': 'Inflation (%)',
      'gini': 'GINI Index',
      'exports': 'Exports (USD)',
      'imports': 'Imports (USD)',
      'unemployment': 'Unemployment Rate (%)',
      'debt': 'External Debt (USD)',
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
      'fdi-inflows': 'FDI Inflows (USD)',
      'fdi-outflows': 'FDI Outflows (USD)',
      'remittances': 'Remittances (USD)'
    };
    return names[slug] || slug;
  }
}

export const historicalIndicatorsService = new HistoricalIndicatorsService();

