// Society Indicators service for the frontend
// Fetches social/development indicators per country from public APIs

export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface SocietyIndicators {
  countryCode3: string; // ISO3 (cca3)
  lifeExpectancy: IndicatorPoint; // SP.DYN.LE00.IN (years)
  literacyRateAdult: IndicatorPoint; // SE.ADT.LITR.ZS (%)
  povertyExtreme215: IndicatorPoint; // SI.POV.DDAY (%)
  uhcServiceCoverageIndex: IndicatorPoint; // SH.UHC.SRVS.CV.XD (0-100)
  primaryNetEnrollment: IndicatorPoint; // SE.PRM.NENR (%)
  populationTotal: IndicatorPoint; // SP.POP.TOTL
  populationGrowth: IndicatorPoint; // SP.POP.GROW (%)
  crudeBirthRate: IndicatorPoint; // SP.DYN.CBRT.IN (per 1,000 people)
  crudeDeathRate: IndicatorPoint; // SP.DYN.CDRT.IN (per 1,000 people)
  urbanPopulationPercent: IndicatorPoint; // SP.URB.TOTL.IN.ZS (%)
  ruralPopulationPercent: IndicatorPoint; // SP.RUR.TOTL.ZS (%)
  populationDensity: IndicatorPoint; // SP.POP.DNST (people per sq. km)
}


class SocietyService {
  private readonly backendBaseUrl: string;

  constructor() {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    this.backendBaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  async getSocietyIndicatorsByISO3(iso3: string): Promise<SocietyIndicators> {
    const url = `${this.backendBaseUrl}/api/society/${encodeURIComponent(iso3.toUpperCase())}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Society API error: ${response.status}`);
      }
      const data = await response.json();
      return data as SocietyIndicators;
    } catch (error) {
      console.error(`Error fetching society data for ${iso3}:`, error);
      // Return empty data structure on error
      return {
        countryCode3: iso3,
        lifeExpectancy: { value: null, year: null },
        literacyRateAdult: { value: null, year: null },
        povertyExtreme215: { value: null, year: null },
        uhcServiceCoverageIndex: { value: null, year: null },
        primaryNetEnrollment: { value: null, year: null },
        populationTotal: { value: null, year: null },
        populationGrowth: { value: null, year: null },
        crudeBirthRate: { value: null, year: null },
        crudeDeathRate: { value: null, year: null },
        urbanPopulationPercent: { value: null, year: null },
        ruralPopulationPercent: { value: null, year: null },
        populationDensity: { value: null, year: null }
      };
    }
  }

  /**
   * Fetch World Bank time series data for a specific country and indicator.
   * Uses backend proxy to avoid CORS issues.
   * @param iso3 ISO3 country code (e.g., 'USA', 'FRA')
   * @param indicatorCode World Bank indicator code (e.g., 'SP.POP.TOTL')
   * @param limitYears Optional: limit to the most recent N years
   * @returns Array of { year, value } points, sorted by year ascending
   */
  async fetchWorldBankSeries(
    iso3: string,
    indicatorCode: string,
    limitYears?: number
  ): Promise<Array<{ year: number; value: number | null }>> {
    const url = `${this.backendBaseUrl}/api/society/${encodeURIComponent(iso3.toUpperCase())}/worldbank/${encodeURIComponent(indicatorCode)}${limitYears ? `?limitYears=${limitYears}` : ''}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`World Bank API error: ${response.status}`);
      }
      
      const series = (await response.json()) as Array<{ year: number; value: number | null }>;
      return series;
    } catch (error) {
      console.error(`Error fetching World Bank series for ${iso3}, indicator ${indicatorCode}:`, error);
      return [];
    }
  }

  // Formatters for display
  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toLocaleString();
  }

  formatPercent(value: number | null | undefined, fractionDigits = 1): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(fractionDigits)}%`;
  }

  formatYears(value: number | null | undefined, fractionDigits = 1): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(fractionDigits)} years`;
  }

  formatPerThousand(value: number | null | undefined, fractionDigits = 1): string {
    if (value === null || value === undefined) return 'N/A';
    return `${Number(value).toFixed(fractionDigits)} per 1,000`;
  }
}

export const societyService = new SocietyService();

export type { SocietyIndicators as TSocietyIndicators };


