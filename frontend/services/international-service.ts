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
  private static readonly WORLD_BANK_BASE = 'https://api.worldbank.org/v2';

  private async fetchWorldBankLatest(iso3: string, indicatorCode: string): Promise<IndicatorPoint> {
    try {
      const url = `${InternationalService.WORLD_BANK_BASE}/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(indicatorCode)}?format=json&per_page=20000`;
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

  async getInternationalData(iso3: string, countryName: string | null): Promise<InternationalData> {
    const [oda, tradePct, currentAccount, fdiIn, fdiOut, remits] = await Promise.all([
      this.fetchWorldBankLatest(iso3, 'DT.ODA.ALLD.CD'),
      this.fetchWorldBankLatest(iso3, 'NE.TRD.GNFS.ZS'),
      this.fetchWorldBankLatest(iso3, 'BN.CAB.XOKA.CD'),
      this.fetchWorldBankLatest(iso3, 'BX.KLT.DINV.CD.WD'),
      this.fetchWorldBankLatest(iso3, 'BM.KLT.DINV.CD.WD'),
      this.fetchWorldBankLatest(iso3, 'BX.TRF.PWKR.CD.DT')
    ]);

    return {
      countryCode3: iso3,
      countryName,
      odaReceivedUsd: oda,
      tradePercentGdp: tradePct,
      currentAccountUsd: currentAccount,
      fdiNetInflowsUsd: fdiIn,
      fdiNetOutflowsUsd: fdiOut,
      remittancesUsd: remits,
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

export const internationalService = new InternationalService();
export type { InternationalData as TInternationalData };




