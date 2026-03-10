export interface CultureSite {
  title: string;
  wikidataUrl: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  unescoId: string | null;
  inscriptionYear: number | null;
}

export interface CultureData {
  countryCode3: string;
  countryName: string | null;
  worldHeritageSites: CultureSite[];
  sources: {
    wikidataSparql: string;
  };
}

class CultureService {
  private static readonly WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

  private buildWorldHeritageQuery(iso3: string): string {
    // Query UNESCO World Heritage Sites (heritage designation P1435 = Q9259)
    // Match by country using ISO3 (P298) and country P17 or admin unit chain P131*
    return `#tool: WL Culture Service
SELECT ?site ?siteLabel ?image ?coord ?unescoId ?inscriptionYear WHERE {
  VALUES ?iso3 { "${iso3}" }
  ?country wdt:P298 ?iso3 .
  ?site wdt:P1435 wd:Q9259 .
  ?site (wdt:P17|wdt:P131*) ?country .
  OPTIONAL { ?site wdt:P18 ?image }
  OPTIONAL { ?site wdt:P625 ?coord }
  OPTIONAL { ?site wdt:P757 ?unescoId }
  OPTIONAL { ?site wdt:P571 ?inception . BIND(year(?inception) AS ?inscriptionYear) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en,es" }
}
ORDER BY ?siteLabel`;
  }

  private async fetchSparql<T = any>(query: string): Promise<T> {
    const url = `${CultureService.WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json'
      },
      method: 'GET'
    });
    if (!res.ok) {
      throw new Error(`Wikidata SPARQL error: ${res.status}`);
    }
    return res.json();
  }

  private parseSites(json: any): CultureSite[] {
    const bindings: any[] = json?.results?.bindings || [];
    const sites: CultureSite[] = [];
    for (const row of bindings) {
      const title = String(row?.siteLabel?.value || row?.site?.value || '');
      const wikidataUrl = String(row?.site?.value || '');
      const imageUrl = row?.image?.value ? String(row.image.value) : null;
      const coord = row?.coord?.value ? String(row.coord.value) : null;
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (coord && coord.startsWith('Point(')) {
        // WKT: Point(long lat)
        const parts = coord.substring(6, coord.length - 1).split(' ');
        if (parts.length === 2) {
          const lon = Number(parts[0]);
          const lat = Number(parts[1]);
          latitude = Number.isFinite(lat) ? lat : null;
          longitude = Number.isFinite(lon) ? lon : null;
        }
      }
      const unescoId = row?.unescoId?.value ? String(row.unescoId.value) : null;
      const inscriptionYear = row?.inscriptionYear?.value ? Number(row.inscriptionYear.value) : null;
      // Deduplicate by Wikidata URL
      const key = wikidataUrl.toLowerCase();
      if (key && !sites.some(s => s.wikidataUrl.toLowerCase() === key)) {
        sites.push({ title, wikidataUrl, imageUrl, latitude, longitude, unescoId, inscriptionYear });
      }
    }
    return sites;
  }

  async getCultureData(iso3: string, countryName: string | null): Promise<CultureData> {
    try {
      const query = this.buildWorldHeritageQuery(iso3);
      const json = await this.fetchSparql(query);
      const worldHeritageSites = this.parseSites(json);
      return {
        countryCode3: iso3,
        countryName,
        worldHeritageSites,
        sources: { wikidataSparql: 'https://query.wikidata.org/sparql' }
      };
    } catch (_err) {
      return {
        countryCode3: iso3,
        countryName,
        worldHeritageSites: [],
        sources: { wikidataSparql: 'https://query.wikidata.org/sparql' }
      };
    }
  }

  formatCount(value: number | null | undefined): string {
    if (!value && value !== 0) return 'N/A';
    return `${value}`;
  }
}

export const cultureService = new CultureService();
export type { CultureData as TCultureData };



