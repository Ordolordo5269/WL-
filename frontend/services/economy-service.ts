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
  gdp_year: number;
}

type WorldBankApiResponse = [
  unknown,
  Array<{
    date: string;
    value: number | null;
  }>
];

interface WorldBankCountryMeta {
  id: string;
  name: string;
  region: { id: string; value: string };
  incomeLevel: { id: string; value: string };
}

class EconomyService {
  private static readonly WB_BASE = 'https://api.worldbank.org/v2';

  private async fetchWorldBankLatest(iso3: string, indicatorCode: string): Promise<{ value: number | null; year: number | null }> {
    try {
      const url = `${EconomyService.WB_BASE}/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(indicatorCode)}?format=json&per_page=20000`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`WorldBank ${indicatorCode} error: ${res.status}`);
      const data = (await res.json()) as WorldBankApiResponse;
      const entries = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
      let latest: { value: number | null; year: number | null } = { value: null, year: null };
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

  private async fetchCountryMeta(iso3: string): Promise<WorldBankCountryMeta | null> {
    try {
      const url = `${EconomyService.WB_BASE}/country/${encodeURIComponent(iso3)}?format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`WorldBank country meta error: ${res.status}`);
      const json: any = await res.json();
      const entry = Array.isArray(json) && Array.isArray(json[1]) ? json[1][0] : null;
      if (!entry) return null;
      return entry as WorldBankCountryMeta;
    } catch (_err) {
      return null;
    }
  }

  async getEconomyDataByISO3(iso3: string, providedCountryName?: string | null): Promise<EconomyData> {
    const [
      gdp,
      gdpPerCapita,
      inflation,
      gini,
      agr,
      ind,
      srv,
      exports,
      imports,
      extDebt,
      unemployment,
      meta
    ] = await Promise.all([
      this.fetchWorldBankLatest(iso3, 'NY.GDP.MKTP.CD'),
      this.fetchWorldBankLatest(iso3, 'NY.GDP.PCAP.CD'),
      this.fetchWorldBankLatest(iso3, 'FP.CPI.TOTL.ZG'),
      this.fetchWorldBankLatest(iso3, 'SI.POV.GINI'),
      this.fetchWorldBankLatest(iso3, 'NV.AGR.TOTL.ZS'),
      this.fetchWorldBankLatest(iso3, 'NV.IND.TOTL.ZS'),
      this.fetchWorldBankLatest(iso3, 'NV.SRV.TOTL.ZS'),
      this.fetchWorldBankLatest(iso3, 'NE.EXP.GNFS.CD'),
      this.fetchWorldBankLatest(iso3, 'NE.IMP.GNFS.CD'),
      this.fetchWorldBankLatest(iso3, 'DT.DOD.DECT.CD'),
      this.fetchWorldBankLatest(iso3, 'SL.UEM.TOTL.ZS'),
      this.fetchCountryMeta(iso3)
    ]);

    const tradeBalance = exports.value !== null && imports.value !== null ? (exports.value - imports.value) : null;
    const region = meta?.region?.value ?? 'N/A';
    const income = meta?.incomeLevel?.value ?? 'N/A';
    const countryName = providedCountryName ?? meta?.name ?? iso3;

    return {
      country_id: iso3,
      gdp_usd: gdp.value,
      gdp_per_capita_usd: gdpPerCapita.value,
      inflation_rate_percent: inflation.value,
      gini_index: gini.value,
      agriculture_percent: agr.value,
      industry_percent: ind.value,
      services_percent: srv.value,
      exports_usd: exports.value,
      imports_usd: imports.value,
      external_debt_usd: extDebt.value,
      unemployment_rate_percent: unemployment.value,
      country_name: countryName,
      region,
      income_level: income,
      trade_balance_usd: tradeBalance,
      gdp_year: Number(gdp.year ?? meta ? (new Date()).getFullYear() : (new Date()).getFullYear())
    };
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