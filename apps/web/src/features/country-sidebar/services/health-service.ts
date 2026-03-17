export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface HealthData {
  countryCode3: string;
  countryName: string | null;
  healthExpenditurePctGdp: IndicatorPoint;
  physiciansPerThousand: IndicatorPoint;
  hospitalBedsPerThousand: IndicatorPoint;
  infantMortalityRate: IndicatorPoint;
  maternalMortalityRatio: IndicatorPoint;
  immunizationMeasles: IndicatorPoint;
  undernourishmentPct: IndicatorPoint;
  sources: { worldBank: string };
}

class HealthService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getHealthData(iso3: string, countryName: string | null): Promise<HealthData> {
    const apiBaseUrl = this.getApiBaseUrl();
    const url = `${apiBaseUrl}/api/health/${encodeURIComponent(iso3.toUpperCase())}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Health API error: ${response.status}`);
      }
      const data = await response.json();
      return data as HealthData;
    } catch (error) {
      console.error(`Error fetching health data for ${iso3}:`, error);
      return {
        countryCode3: iso3,
        countryName,
        healthExpenditurePctGdp: { value: null, year: null },
        physiciansPerThousand: { value: null, year: null },
        hospitalBedsPerThousand: { value: null, year: null },
        infantMortalityRate: { value: null, year: null },
        maternalMortalityRatio: { value: null, year: null },
        immunizationMeasles: { value: null, year: null },
        undernourishmentPct: { value: null, year: null },
        sources: { worldBank: 'https://api.worldbank.org/v2/' }
      };
    }
  }

  formatPercent(value: number | null, fractionDigits = 2): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(fractionDigits)}%`;
  }

  formatNumber(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toLocaleString();
  }

  formatPerThousand(value: number | null, fractionDigits = 1): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(fractionDigits)} per 1,000`;
  }

  formatPerHundredThousand(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toLocaleString()} per 100k`;
  }
}

export const healthService = new HealthService();
export type { HealthData as THealthData };
