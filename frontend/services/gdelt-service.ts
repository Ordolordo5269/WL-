export type Timespan = '24h' | '48h' | '7d' | '14d' | '30d' | '3m';

class GdeltService {
  private readonly apiBaseUrl: string;

  constructor() {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    this.apiBaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  getBaseUrl(): string {
    return this.apiBaseUrl;
  }

  private buildUrl(path: string, params: Record<string, string | number | boolean | undefined>) {
    const url = new URL(`${this.apiBaseUrl}${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
    return url.toString();
  }

  async fetchDocs(query: string, timespan: Timespan = '7d', maxrecords = 50): Promise<any> {
    const url = this.buildUrl('/api/gdelt/doc', { q: query, timespan, maxrecords });
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`GDELT doc error: ${res.status}`);
    return res.json();
  }

  async fetchTimeline(query: string, timespan: Timespan = '30d', mode: 'timelinevol' | 'timelinevolnorm' = 'timelinevol'): Promise<any> {
    const url = this.buildUrl('/api/gdelt/timeline', { q: query, timespan, mode });
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`GDELT timeline error: ${res.status}`);
    return res.json();
  }

  async fetchGkg(query: string, timespan: Timespan = '7d'): Promise<any> {
    const url = this.buildUrl('/api/gdelt/gkg', { q: query, timespan });
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`GDELT gkg error: ${res.status}`);
    return res.json();
  }

  async fetchGeo(query: string, timespan: Timespan = '7d'): Promise<any> {
    const url = this.buildUrl('/api/gdelt/geo', { q: query, timespan });
    const res = await fetch(url, { headers: { 'Accept': 'application/geo+json, application/json' } });
    if (!res.ok) throw new Error(`GDELT geo error: ${res.status}`);
    return res.json();
  }
}

export const gdeltService = new GdeltService();


