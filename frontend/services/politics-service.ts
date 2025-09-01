export interface IndicatorPoint {
  value: number | null;
  year: number | null;
}

export interface WikipediaEntry {
  title: string;
  url: string;
  role?: 'head_of_government' | 'head_of_state';
  office?: string;
  person?: string;
}

export interface PoliticsData {
  countryCode3: string; // ISO3 (cca3)
  countryName: string;
  wgiPoliticalStability: IndicatorPoint; // WGI PV.EST
  democracyIndex: IndicatorPoint; // Proxy: WGI VA.EST normalized to 0-10
  wgiGovernmentEffectiveness: IndicatorPoint; // GE.EST
  wgiRegulatoryQuality: IndicatorPoint; // RQ.EST
  wgiRuleOfLaw: IndicatorPoint; // RL.EST
  wgiControlOfCorruption: IndicatorPoint; // CC.EST
  headsOfGovernment: WikipediaEntry[]; // e.g., Prime Minister, President
  formOfGovernment?: string | null;
  sources: {
    worldBankWgi: string;
    wikidata: string;
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

  private async fetchOfficesFromBackend(iso3: string): Promise<{ formOfGovernment: string | null; offices: Array<{ officeLabel: string; personLabel: string; role: 'head_of_government' | 'head_of_state'; personUrl: string | null }> }> {
    const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
    const res = await fetch(`${base}/api/politics/offices/${encodeURIComponent(iso3)}`);
    if (!res.ok) throw new Error(`offices ${res.status}`);
    const json = await res.json();
    const offices = Array.isArray(json.offices) ? json.offices.map((o: any) => ({
      officeLabel: String(o.officeLabel || ''),
      personLabel: String(o.personLabel || ''),
      role: o.role === 'head_of_state' ? 'head_of_state' : 'head_of_government',
      personUrl: o.personUrl ? String(o.personUrl) : null
    })) : [];
    return { formOfGovernment: json.formOfGovernment ?? null, offices };
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
    const [wgiPoliticalStability, wgiVoiceAccountability, wgiGovernmentEffectiveness, wgiRegulatoryQuality, wgiRuleOfLaw, wgiControlOfCorruption, officesPayload] = await Promise.all([
      this.fetchWorldBankLatest(iso3, 'PV.EST'),
      this.fetchWorldBankLatest(iso3, 'VA.EST'),
      this.fetchWorldBankLatest(iso3, 'GE.EST'),
      this.fetchWorldBankLatest(iso3, 'RQ.EST'),
      this.fetchWorldBankLatest(iso3, 'RL.EST'),
      this.fetchWorldBankLatest(iso3, 'CC.EST'),
      this.fetchOfficesFromBackend(iso3).catch(() => ({ formOfGovernment: null, offices: [] }))
    ]);
    // Defensive deduplication in case backend or external sources return duplicates
    const tempHeads: WikipediaEntry[] = officesPayload.offices.map((o) => ({
      title: `${o.officeLabel} — ${o.personLabel}`,
      url: o.personUrl || '',
      role: o.role,
      office: o.officeLabel,
      person: o.personLabel
    }));
    const seen = new Set<string>();
    const headsOfGovernment: WikipediaEntry[] = [];
    for (const h of tempHeads) {
      const key = `${h.title.toLowerCase()}||${(h.url || '').toLowerCase()}||${h.role ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        headsOfGovernment.push(h);
      }
    }

    // Normalize VA.EST (-2.5 to 2.5) to a 0–10 scale
    const democracyIndex: IndicatorPoint = (() => {
      if (wgiVoiceAccountability.value === null) return { value: null, year: wgiVoiceAccountability.year };
      const normalized = ((Number(wgiVoiceAccountability.value) + 2.5) / 5) * 10;
      const clamped = Math.max(0, Math.min(10, normalized));
      return { value: Number(clamped.toFixed(2)), year: wgiVoiceAccountability.year };
    })();

    return {
      countryCode3: iso3,
      countryName,
      wgiPoliticalStability,
      democracyIndex,
      wgiGovernmentEffectiveness,
      wgiRegulatoryQuality,
      wgiRuleOfLaw,
      wgiControlOfCorruption,
      headsOfGovernment,
      formOfGovernment: officesPayload.formOfGovernment,
      sources: {
        worldBankWgi: 'https://api.worldbank.org/v2/',
        wikidata: 'https://query.wikidata.org/sparql'
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


