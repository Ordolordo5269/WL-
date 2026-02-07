export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface InternationalData {
  countryCode3: string;
  countryName: string | null;
  odaReceivedUsd: IndicatorPoint; // DT.ODA.ALLD.CD (net ODA received)
  tradePercentGdp: IndicatorPoint; // NE.TRD.GNFS.ZS (Trade % of GDP)
  currentAccountUsd: IndicatorPoint; // BN.CAB.XOKA.CD
  fdiNetInflowsUsd: IndicatorPoint; // BX.KLT.DINV.CD.WD
  fdiNetOutflowsUsd: IndicatorPoint; // BM.KLT.DINV.CD.WD
  remittancesUsd: IndicatorPoint; // BX.TRF.PWKR.CD.DT (Personal remittances received)
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

class InternationalService {
  private getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getInternationalData(iso3: string, countryName: string | null): Promise<InternationalData> {
    const apiBaseUrl = this.getApiBaseUrl();
    const url = `${apiBaseUrl}/api/international/${encodeURIComponent(iso3.toUpperCase())}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`International API error: ${response.status}`);
      }
      const data = await response.json();
      return data as InternationalData;
    } catch (error) {
      console.error(`Error fetching international data for ${iso3}:`, error);
      // Return empty data structure on error
      return {
        countryCode3: iso3,
        countryName,
        odaReceivedUsd: { value: null, year: null },
        tradePercentGdp: { value: null, year: null },
        currentAccountUsd: { value: null, year: null },
        fdiNetInflowsUsd: { value: null, year: null },
        fdiNetOutflowsUsd: { value: null, year: null },
        remittancesUsd: { value: null, year: null },
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

export const internationalService = new InternationalService();
export type { InternationalData as TInternationalData };







