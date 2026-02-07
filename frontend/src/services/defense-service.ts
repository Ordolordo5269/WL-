export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface DefenseData {
  countryCode3: string;
  countryName: string | null;
  militaryExpenditurePctGdp: IndicatorPoint; // MS.MIL.XPND.GD.ZS
  militaryExpenditureUsd: IndicatorPoint; // MS.MIL.XPND.CD
  armedForcesPersonnelTotal: IndicatorPoint; // MS.MIL.TOTL.P1
  armsImportsTiv: IndicatorPoint; // MS.MIL.MPRT.KD
  armsExportsTiv: IndicatorPoint; // MS.MIL.XPRT.KD
  battleRelatedDeaths: IndicatorPoint; // VC.BTL.DETH
  populationTotal: IndicatorPoint; // SP.POP.TOTL (for per-capita if needed)
  sources: {
    worldBank: string;
  };
}

type WorldBankApiResponse = [
  unknown,
  Array<{
    date: string;
    value: number | null;
  }>
];

class DefenseService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getDefenseData(iso3: string, countryName: string | null): Promise<DefenseData> {
    const apiBaseUrl = this.getApiBaseUrl();
    const url = `${apiBaseUrl}/api/defense/${encodeURIComponent(iso3.toUpperCase())}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Defense API error: ${response.status}`);
      }
      const data = await response.json();
      return data as DefenseData;
    } catch (error) {
      console.error(`Error fetching defense data for ${iso3}:`, error);
      // Return empty data structure on error
      return {
        countryCode3: iso3,
        countryName,
        militaryExpenditurePctGdp: { value: null, year: null },
        militaryExpenditureUsd: { value: null, year: null },
        armedForcesPersonnelTotal: { value: null, year: null },
        armsImportsTiv: { value: null, year: null },
        armsExportsTiv: { value: null, year: null },
        battleRelatedDeaths: { value: null, year: null },
        populationTotal: { value: null, year: null },
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

export const defenseService = new DefenseService();
export type { DefenseData as TDefenseData };







