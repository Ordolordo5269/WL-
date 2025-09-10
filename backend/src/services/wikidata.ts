import { setTimeout as delay } from 'timers/promises';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const DEFAULT_UA = process.env.WIKIDATA_USER_AGENT || 'WorldLore/1.0 (contact@example.com)';

export interface SparqlBinding {
  type: string;
  value: string;
}

export interface RawRow {
  event: SparqlBinding;
  eventLabel?: SparqlBinding;
  coord: SparqlBinding; // WKT Point string
  when?: SparqlBinding;
  start?: SparqlBinding;
  end?: SparqlBinding;
  countryLabel?: SparqlBinding;
  wpEN?: SparqlBinding;
  types?: SparqlBinding;
}

export interface SparqlResponse {
  head: { vars: string[] };
  results: { bindings: RawRow[] };
}

export type RawResult = RawRow;

function jitter(ms: number) {
  const variance = ms * 0.2;
  return ms + (Math.random() * 2 - 1) * variance;
}

async function fetchSparql(query: string, attempt: number, abortSignal: AbortSignal): Promise<SparqlResponse> {
  const headers = {
    'Accept': 'application/sparql-results+json',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': DEFAULT_UA
  } as const;
  const body = new URLSearchParams({ query });
  const res = await fetch(WIKIDATA_ENDPOINT, { method: 'POST', headers, body, signal: abortSignal });

  if (res.status === 429) {
    // Explicitly throw to trigger retry logic
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(`429 Too Many Requests: ${text}`), { status: 429 });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SPARQL HTTP ${res.status}: ${text}`);
  }
  const data = (await res.json()) as SparqlResponse;
  return data;
}

async function runWithRetries<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  // Backoff 500ms, 1500ms, 3500ms with jitter
  const delays = [500, 1500, 3500];
  for (let attempt = 0; attempt < delays.length + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    try {
      const res = await fn(controller.signal);
      clearTimeout(timeoutId);
      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const status = err?.status as number | undefined;
      const isLast = attempt === delays.length;
      logger.warn({ attempt, status, err: err?.message }, 'SPARQL request failed');
      if (isLast) throw err;
      const wait = jitter(delays[attempt]);
      await delay(wait);
    }
  }
  // Shouldn't reach here
  throw new Error('Unexpected retry loop termination');
}

export function buildPointEventsQuery(days: number): string {
  return `SELECT ?event ?eventLabel ?coord ?when ?countryLabel ?wpEN ?types\nWHERE {\n  VALUES ?types { wd:Q219438 wd:Q123471 wd:Q232852 wd:Q350604 wd:Q178561 }\n  ?event wdt:P31 ?types ;\n         wdt:P625 ?coord ;\n         wdt:P585 ?when .\n  FILTER(?when >= NOW() - \"P${days}D\"^^xsd:duration)\n  OPTIONAL { ?event wdt:P17 ?country . }\n  OPTIONAL {\n    ?wpEN schema:about ?event ;\n          schema:inLanguage \"en\" ;\n          schema:isPartOf <https://en.wikipedia.org/> .\n  }\n  SERVICE wikibase:label { bd:serviceParam wikibase:language \"en,es,fr,de\". }\n}\nLIMIT 1000`;
}

export function buildRangeEventsQuery(days: number): string {
  return `SELECT ?event ?eventLabel ?coord ?start ?end ?countryLabel ?wpEN ?types\nWHERE {\n  VALUES ?types { wd:Q219438 wd:Q123471 wd:Q232852 wd:Q350604 wd:Q178561 }\n  ?event wdt:P31 ?types ;\n         wdt:P625 ?coord ;\n         wdt:P580 ?start .\n  OPTIONAL { ?event wdt:P582 ?end . }\n  BIND(NOW() - \"P${days}D\"^^xsd:duration AS ?tmin)\n  BIND(NOW() AS ?tmax)\n  FILTER(\n    (?end && ?start <= ?tmax && ?end >= ?tmin) ||\n    (!BOUND(?end) && ?start <= ?tmax)\n  )\n  OPTIONAL { ?event wdt:P17 ?country . }\n  OPTIONAL {\n    ?wpEN schema:about ?event ;\n          schema:inLanguage \"en\" ;\n          schema:isPartOf <https://en.wikipedia.org/> .\n  }\n  SERVICE wikibase:label { bd:serviceParam wikibase:language \"en,es,fr,de\". }\n}\nLIMIT 1000`;
}

export async function queryRecentPointEvents(days: number): Promise<RawResult[]> {
  const query = buildPointEventsQuery(days);
  const res = await runWithRetries((signal) => fetchSparql(query, 0, signal));
  return res.results.bindings;
}

export async function queryRecentRangeEvents(days: number): Promise<RawResult[]> {
  const query = buildRangeEventsQuery(days);
  const res = await runWithRetries((signal) => fetchSparql(query, 0, signal));
  return res.results.bindings;
}

export function qidFromUri(uri: string): string | null {
  const id = uri.split('/').pop();
  return id && /^Q\d+$/.test(id) ? id : null;
}

export function parseWktPoint(wkt: string): [number, number] | null {
  // Expecting something like: "Point(12.34 56.78)" possibly with SRID
  const match = /Point\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(wkt);
  if (!match) return null;
  const lon = Number(match[1]);
  const lat = Number(match[2]);
  if (Number.isNaN(lon) || Number.isNaN(lat)) return null;
  return [lon, lat];
}

