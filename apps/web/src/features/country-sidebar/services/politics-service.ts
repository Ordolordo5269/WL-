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

export interface FreedomHouseData {
  politicalRights: IndicatorPoint;
  civilLiberties: IndicatorPoint;
  status: { value: string | null; numeric: number | null; year: number | null };
}

export interface CorruptionIndexData {
  score: IndicatorPoint;
  rank: IndicatorPoint;
}

export interface FragileStatesData {
  score: IndicatorPoint;
  rank: IndicatorPoint;
}

export interface VDemData {
  electoralDemocracy: IndicatorPoint;
  liberalDemocracy: IndicatorPoint;
  freedomOfExpression: IndicatorPoint;
  cleanElections: IndicatorPoint;
  ruleOfLaw: IndicatorPoint;
}

export interface Polity5Data {
  score: IndicatorPoint;
}

export interface PeaceIndexData {
  score: IndicatorPoint;
  rank: IndicatorPoint;
}

export interface SanctionEntityData {
  entityName: string;
  entityType: string;
  sanctionProgram: string;
  sanctionAuthority: string;
  reason: string | null;
  listedAt: string | null;
}

export interface SanctionsData {
  count: number;
  entities: SanctionEntityData[];
}

export interface ElectionEntryData {
  electionType: string;
  year: number;
  electionDate: string | null;
  status: string;
  turnoutPercent: number | null;
  description: string | null;
}

export interface ElectionsData {
  upcoming: ElectionEntryData[];
  recent: ElectionEntryData[];
}

export interface PoliticsData {
  countryCode3: string;
  countryName: string;
  wgiPoliticalStability: IndicatorPoint;
  democracyIndex: IndicatorPoint;
  wgiGovernmentEffectiveness: IndicatorPoint;
  wgiRegulatoryQuality: IndicatorPoint;
  wgiRuleOfLaw: IndicatorPoint;
  wgiControlOfCorruption: IndicatorPoint;
  freedomHouse?: FreedomHouseData;
  corruptionIndex?: CorruptionIndexData;
  fragileStatesIndex?: FragileStatesData;
  vdem?: VDemData;
  polity5?: Polity5Data;
  globalPeaceIndex?: PeaceIndexData;
  sanctions?: SanctionsData;
  elections?: ElectionsData;
  headsOfGovernment: WikipediaEntry[];
  formOfGovernment?: string | null;
  sources: Record<string, string>;
}

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
        freedomHouse: undefined,
        corruptionIndex: undefined,
        fragileStatesIndex: undefined,
        headsOfGovernment: [],
        formOfGovernment: null,
        sources: {},
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


