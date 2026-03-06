export interface EconomyData {
  country_id: string;
  gdp_usd: number | null;
  gdp_per_capita_usd: number | null;
  inflation_rate_percent: number | null;
  gini_index: number | null;
  agriculture_percent: number | null;
  industry_percent: number | null;
  services_percent: number | null;
  exports_usd: number | null;
  imports_usd: number | null;
  external_debt_usd: number | null;
  unemployment_rate_percent: number | null;
  country_name: string;
  region: string;
  income_level: string;
  trade_balance_usd: number | null;
  gdp_year: number | null;
}

class EconomyService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getEconomyDataByISO3(iso3: string, _providedCountryName?: string | null): Promise<EconomyData> {
    const apiBaseUrl = this.getApiBaseUrl();
    const url = `${apiBaseUrl}/api/economy/${encodeURIComponent(iso3.toUpperCase())}`;
    const res = await fetch(url);
    if (!res.ok) {
      let errorText = '';
      try {
        errorText = await res.text();
      } catch {
        errorText = 'Unable to read error response';
      }
      throw new Error(`Economy API error: ${res.status} - ${errorText}`);
    }
    const data = (await res.json()) as EconomyData;
    return data;
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  }

  formatPercentage(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(2)}%`;
  }

  formatNumber(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toLocaleString();
  }
}

export const economyService = new EconomyService();