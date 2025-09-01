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
  private static readonly WORLD_BANK_BASE = 'https://api.worldbank.org/v2';

  private async fetchWorldBankLatest(iso3: string, indicatorCode: string): Promise<IndicatorPoint> {
    try {
      const url = `${TechnologyService.WORLD_BANK_BASE}/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(indicatorCode)}?format=json&per_page=20000`;
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

  async getTechnologyData(iso3: string, countryName: string | null): Promise<TechnologyData> {
    const [rndPct, techExpUsd, researchers, patents, journals] = await Promise.all([
      this.fetchWorldBankLatest(iso3, 'GB.XPD.RSDV.GD.ZS'),
      this.fetchWorldBankLatest(iso3, 'TX.VAL.TECH.CD'),
      this.fetchWorldBankLatest(iso3, 'SP.POP.SCIE.RD.P6'),
      this.fetchWorldBankLatest(iso3, 'IP.PAT.RESD'),
      this.fetchWorldBankLatest(iso3, 'IP.JRN.ARTC.SC')
    ]);

    return {
      countryCode3: iso3,
      countryName,
      rndExpenditurePctGdp: rndPct,
      highTechExportsUsd: techExpUsd,
      researchersPerMillion: researchers,
      patentApplicationsResidents: patents,
      scientificJournalArticles: journals,
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

export const technologyService = new TechnologyService();
export type { TechnologyData as TTechnologyData };



