export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface WikipediaEntry {
  title: string;
  url: string;
  role?: 'head_of_government' | 'head_of_state';
  office?: string;
  person?: string;
}

export interface PoliticsData {
  countryCode3: string; // ISO3 (cca3)
  countryName: string;
  wgiPoliticalStability: IndicatorPoint; // WGI PV.EST
  democracyIndex: IndicatorPoint; // Proxy: WGI VA.EST normalized to 0-10
  wgiGovernmentEffectiveness: IndicatorPoint; // GE.EST
  wgiRegulatoryQuality: IndicatorPoint; // RQ.EST
  wgiRuleOfLaw: IndicatorPoint; // RL.EST
  wgiControlOfCorruption: IndicatorPoint; // CC.EST
  headsOfGovernment: WikipediaEntry[]; // e.g., Prime Minister, President
  formOfGovernment?: string | null;
  sources: {
    worldBankWgi: string;
    wikidata: string;
  };
}

type WorldBankApiResponse = [
  unknown,
  Array<{
    date: string;
    value: number | null;
  }>
];

class PoliticsService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getPoliticsData(countryName: string, iso3: string): Promise<PoliticsData> {
    const apiBaseUrl = this.getApiBaseUrl();
    const url = `${apiBaseUrl}/api/politics/${encodeURIComponent(iso3.toUpperCase())}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Politics API error: ${response.status}`);
      }
      const data = await response.json();
      return data as PoliticsData;
    } catch (error) {
      console.error(`Error fetching politics data for ${iso3}:`, error);
      // Return empty data structure on error
      return {
        countryCode3: iso3,
        countryName,
        wgiPoliticalStability: { value: null, year: null },
        democracyIndex: { value: null, year: null },
        wgiGovernmentEffectiveness: { value: null, year: null },
        wgiRegulatoryQuality: { value: null, year: null },
        wgiRuleOfLaw: { value: null, year: null },
        wgiControlOfCorruption: { value: null, year: null },
        headsOfGovernment: [],
        formOfGovernment: null,
        sources: {
          worldBankWgi: 'https://api.worldbank.org/v2/',
          wikidata: 'https://query.wikidata.org/sparql'
        }
      };
    }
  }

  // Formatters for display
  formatNumber(value: number | null | undefined, fractionDigits = 2): string {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toFixed(fractionDigits);
  }
}

export const politicsService = new PoliticsService();
export type { PoliticsData as TPoliticsData };


