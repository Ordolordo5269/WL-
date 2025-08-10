export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface WikipediaEntry {
  title: string;
  url: string;
}

export interface PoliticsData {
  countryCode3: string; // ISO3 (cca3)
  countryName: string;
  wgiPoliticalStability: IndicatorPoint; // WGI PV.EST
  headsOfGovernment: WikipediaEntry[]; // e.g., Prime Minister, President
  sources: {
    worldBankWgi: string;
    parlGov: string;
    mediaWiki: string;
    vdem: string;
  };
}

type WorldBankApiResponse = [
  unknown,
  Array<{
    date: string;
    value: number | null;
  }>
];

class PoliticsService {
  private static readonly WORLD_BANK_BASE = 'https://api.worldbank.org/v2';
  private static readonly MEDIAWIKI_API = 'https://en.wikipedia.org/w/api.php';

  private async fetchWorldBankLatest(iso3: string, indicatorCode: string): Promise<IndicatorPoint> {
    try {
      const url = `${PoliticsService.WORLD_BANK_BASE}/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(indicatorCode)}?format=json&per_page=20000`;
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

  private async searchWikipedia(query: string): Promise<WikipediaEntry | null> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: query,
        format: 'json',
        origin: '*'
      });
      const url = `${PoliticsService.MEDIAWIKI_API}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Wikipedia error: ${res.status}`);
      const json: any = await res.json();
      const hit = json?.query?.search?.[0];
      if (!hit) return null;
      const pageId = hit.pageid;
      const title = hit.title as string;
      const pageUrl = `https://en.wikipedia.org/?curid=${pageId}`;
      return { title, url: pageUrl };
    } catch (_err) {
      return null;
    }
  }

  async getPoliticsData(countryName: string, iso3: string): Promise<PoliticsData> {
    const [wgiPoliticalStability, pm, president, government] = await Promise.all([
      this.fetchWorldBankLatest(iso3, 'PV.EST'),
      this.searchWikipedia(`Prime Minister of ${countryName}`),
      this.searchWikipedia(`President of ${countryName}`),
      this.searchWikipedia(`Government of ${countryName}`)
    ]);

    const headsOfGovernment: WikipediaEntry[] = [];
    for (const entry of [pm, president, government]) {
      if (entry) headsOfGovernment.push(entry);
    }

    return {
      countryCode3: iso3,
      countryName,
      wgiPoliticalStability,
      headsOfGovernment,
      sources: {
        worldBankWgi: 'https://api.worldbank.org/v2/',
        parlGov: 'http://api.parlgov.org/',
        mediaWiki: 'https://en.wikipedia.org/w/api.php',
        vdem: 'https://v-dem.net/vdemds/api/'
      }
    };
  }

  // Formatters for display
  formatNumber(value: number | null | undefined, fractionDigits = 2): string {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toFixed(fractionDigits);
  }
}

export const politicsService = new PoliticsService();
export type { PoliticsData as TPoliticsData };


