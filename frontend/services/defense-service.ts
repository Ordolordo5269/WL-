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
  private static readonly WORLD_BANK_BASE = 'https://api.worldbank.org/v2';

  private async fetchWorldBankLatest(iso3: string, indicatorCode: string): Promise<IndicatorPoint> {
    try {
      const url = `${DefenseService.WORLD_BANK_BASE}/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(indicatorCode)}?format=json&per_page=20000`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`WorldBank ${indicatorCode} error: ${response.status}`);
      const data = (await response.json()) as WorldBankApiResponse;
      const entries = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
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

  async getDefenseData(iso3: string, countryName: string | null): Promise<DefenseData> {
    const [
      expPctGdp,
      expUsd,
      forces,
      imp,
      exp,
      deaths,
      pop
    ] = await Promise.all([
      this.fetchWorldBankLatest(iso3, 'MS.MIL.XPND.GD.ZS'),
      this.fetchWorldBankLatest(iso3, 'MS.MIL.XPND.CD'),
      this.fetchWorldBankLatest(iso3, 'MS.MIL.TOTL.P1'),
      this.fetchWorldBankLatest(iso3, 'MS.MIL.MPRT.KD'),
      this.fetchWorldBankLatest(iso3, 'MS.MIL.XPRT.KD'),
      this.fetchWorldBankLatest(iso3, 'VC.BTL.DETH'),
      this.fetchWorldBankLatest(iso3, 'SP.POP.TOTL')
    ]);

    return {
      countryCode3: iso3,
      countryName,
      militaryExpenditurePctGdp: expPctGdp,
      militaryExpenditureUsd: expUsd,
      armedForcesPersonnelTotal: forces,
      armsImportsTiv: imp,
      armsExportsTiv: exp,
      battleRelatedDeaths: deaths,
      populationTotal: pop,
      sources: { worldBank: 'https://api.worldbank.org/v2/' }
    };
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







