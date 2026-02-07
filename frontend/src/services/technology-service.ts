export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface TechnologyData {
  countryCode3: string;
  countryName: string | null;
  rndExpenditurePctGdp: IndicatorPoint; // GB.XPD.RSDV.GD.ZS (R&D expenditure % of GDP)
  highTechExportsUsd: IndicatorPoint; // TX.VAL.TECH.CD (High-technology exports, current US$)
  researchersPerMillion: IndicatorPoint; // SP.POP.SCIE.RD.P6 (Researchers in R&D, per million people)
  patentApplicationsResidents: IndicatorPoint; // IP.PAT.RESD (Patent applications, residents)
  scientificJournalArticles: IndicatorPoint; // IP.JRN.ARTC.SC (Scientific and technical journal articles)
  sources: { worldBank: string };
}

type WorldBankApiResponse = [
  unknown,
  Array<{
    date: string;
    value: number | null;
  }>
];

class TechnologyService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getTechnologyData(iso3: string, countryName: string | null): Promise<TechnologyData> {
    const apiBaseUrl = this.getApiBaseUrl();
    const url = `${apiBaseUrl}/api/technology/${encodeURIComponent(iso3.toUpperCase())}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Technology API error: ${response.status}`);
      }
      const data = await response.json();
      return data as TechnologyData;
    } catch (error) {
      console.error(`Error fetching technology data for ${iso3}:`, error);
      // Return empty data structure on error
      return {
        countryCode3: iso3,
        countryName,
        rndExpenditurePctGdp: { value: null, year: null },
        highTechExportsUsd: { value: null, year: null },
        researchersPerMillion: { value: null, year: null },
        patentApplicationsResidents: { value: null, year: null },
        scientificJournalArticles: { value: null, year: null },
        sources: { worldBank: 'https://api.worldbank.org/v2/' }
      };
    }
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  }

  formatPercent(value: number | null, fractionDigits = 2): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(fractionDigits)}%`;
  }

  formatNumber(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toLocaleString();
  }
}

export const technologyService = new TechnologyService();
export type { TechnologyData as TTechnologyData };







