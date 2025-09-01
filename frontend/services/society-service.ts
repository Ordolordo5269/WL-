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

type WorldBankApiResponse = [
  unknown,
  Array<{
    indicator: { id: string; value: string };
    country: { id: string; value: string };
    countryiso3code?: string;
    date: string; // year
    value: number | null;
    unit?: string | null;
  }>
];

class SocietyService {
  private static readonly WORLD_BANK_BASE = 'https://api.worldbank.org/v2';
  private readonly backendBaseUrl: string;

  constructor() {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    this.backendBaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  // Generic fetch for a single World Bank indicator, return latest non-null point
  private async fetchWorldBankLatest(iso3: string, indicatorCode: string): Promise<IndicatorPoint> {
    try {
      const url = `${SocietyService.WORLD_BANK_BASE}/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(indicatorCode)}?format=json&per_page=20000`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`WorldBank ${indicatorCode} error: ${response.status}`);
      }
      const data = (await response.json()) as WorldBankApiResponse;
      const entries = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
      // Find most recent non-null value
      let latest: IndicatorPoint = { value: null, year: null };
      for (const row of entries) {
        if (row.value !== null) {
          const year = Number(row.date);
          if (latest.year === null || (Number.isFinite(year) && year > (latest.year ?? -Infinity))) {
            latest = { value: row.value, year };
          }
        }
      }
      return latest;
    } catch (_err) {
      return { value: null, year: null };
    }
  }

  // Public: small time series for last N years (non-null points only, ascending by year)
  async fetchWorldBankSeries(
    iso3: string,
    indicatorCode: string,
    maxYears: number = 15
  ): Promise<Array<{ year: number; value: number | null }>> {
    try {
      const url = `${SocietyService.WORLD_BANK_BASE}/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(indicatorCode)}?format=json&per_page=20000`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`WorldBank ${indicatorCode} error: ${response.status}`);
      }
      const data = (await response.json()) as WorldBankApiResponse;
      const entries = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
      const points = entries
        .map(row => ({ year: Number(row.date), value: row.value }))
        .filter(p => Number.isFinite(p.year))
        .sort((a, b) => a.year - b.year);
      // Take last maxYears items (keep nulls if present for continuity)
      return points.slice(Math.max(0, points.length - maxYears));
    } catch (_err) {
      return [];
    }
  }

  // HDI removed per product requirement

  async getSocietyIndicatorsByISO3(iso3: string): Promise<SocietyIndicators> {
    const [
      lifeExpectancy,
      literacyRateAdult,
      povertyExtreme215,
      uhcServiceCoverageIndex,
      primaryNetEnrollment,
      populationTotal,
      populationGrowth,
      crudeBirthRate,
      crudeDeathRate,
      urbanPopulationPercent,
      ruralPopulationPercent,
      populationDensity
    ] = await Promise.all([
      this.fetchWorldBankLatest(iso3, 'SP.DYN.LE00.IN'),
      this.fetchWorldBankLatest(iso3, 'SE.ADT.LITR.ZS'),
      this.fetchWorldBankLatest(iso3, 'SI.POV.DDAY'),
      this.fetchWorldBankLatest(iso3, 'SH.UHC.SRVS.CV.XD'),
      this.fetchWorldBankLatest(iso3, 'SE.PRM.NENR'),
      this.fetchWorldBankLatest(iso3, 'SP.POP.TOTL'),
      this.fetchWorldBankLatest(iso3, 'SP.POP.GROW'),
      this.fetchWorldBankLatest(iso3, 'SP.DYN.CBRT.IN'),
      this.fetchWorldBankLatest(iso3, 'SP.DYN.CDRT.IN'),
      this.fetchWorldBankLatest(iso3, 'SP.URB.TOTL.IN.ZS'),
      this.fetchWorldBankLatest(iso3, 'SP.RUR.TOTL.ZS'),
      this.fetchWorldBankLatest(iso3, 'SP.POP.DNST')
    ]);

    return {
      countryCode3: iso3,
      lifeExpectancy,
      literacyRateAdult,
      povertyExtreme215,
      uhcServiceCoverageIndex,
      primaryNetEnrollment,
      populationTotal,
      populationGrowth,
      crudeBirthRate,
      crudeDeathRate,
      urbanPopulationPercent,
      ruralPopulationPercent,
      populationDensity
    };
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


