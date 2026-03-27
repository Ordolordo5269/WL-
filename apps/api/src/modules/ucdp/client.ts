import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const UCDP_BASE_URL = 'https://ucdpapi.pcr.uu.se/api';
const PAGE_SIZE = 1000;
const MAX_RETRIES = 3;

export interface UcdpRawEvent {
  id: number;
  relid: string;
  year: number;
  active_year: boolean;
  type_of_violence: number;
  conflict_new_id: number;
  conflict_name: string;
  dyad_new_id: number;
  dyad_name: string;
  side_a: string;
  side_b: string;
  side_a_new_id: number;
  side_b_new_id: number;
  number_of_sources: number;
  source_article: string;
  source_headline: string;
  where_coordinates: string;
  where_description: string;
  adm_1: string;
  adm_2: string | null;
  latitude: number;
  longitude: number;
  geom_wkt: string;
  priogrid_gid: number;
  country: string;
  country_id: number;
  region: string;
  date_start: string;
  date_end: string;
  deaths_a: number;
  deaths_b: number;
  deaths_civilians: number;
  deaths_unknown: number;
  best: number;
  high: number;
  low: number;
  gwnoa: string | null;
  gwnob: string | null;
  code_status: string;
  event_clarity: number;
  date_prec: number;
  where_prec: number;
}

interface UcdpApiResponse {
  TotalCount: number;
  TotalPages: number;
  PreviousPageUrl: string | null;
  NextPageUrl: string;
  Result: UcdpRawEvent[];
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'x-ucdp-access-token': env.UCDP_API_TOKEN || '',
        },
      });
      if (response.ok) return response;

      if (response.status === 429 && attempt < retries) {
        const wait = Math.pow(2, attempt) * 1000;
        logger.warn({ attempt, wait }, 'UCDP rate limited, retrying...');
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      throw new Error(`UCDP API returned ${response.status}: ${response.statusText}`);
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = Math.pow(2, attempt) * 1000;
      logger.warn({ attempt, err }, 'UCDP fetch failed, retrying...');
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error('UCDP fetch exhausted retries');
}

/**
 * Fetch all GED events for a specific UCDP candidate version
 */
export async function fetchGedEvents(
  version: string,
  startDate?: string,
  endDate?: string
): Promise<UcdpRawEvent[]> {
  const allEvents: UcdpRawEvent[] = [];
  let page = 0;

  const params = new URLSearchParams({ pagesize: String(PAGE_SIZE) });
  if (startDate) params.set('StartDate', startDate);
  if (endDate) params.set('EndDate', endDate);

  while (true) {
    params.set('page', String(page));
    const url = `${UCDP_BASE_URL}/gedevents/${version}?${params}`;
    logger.info({ url, page }, 'Fetching UCDP GED events page');

    const response = await fetchWithRetry(url);
    const data: UcdpApiResponse = await response.json();

    allEvents.push(...data.Result);

    if (page >= data.TotalPages - 1 || data.NextPageUrl === '') break;
    page++;
  }

  logger.info({ version, total: allEvents.length }, 'UCDP GED events fetched');
  return allEvents;
}

/**
 * Discover which candidate versions exist for a given year (e.g. 26.0.1, 26.0.2, ...)
 */
export async function discoverCandidateVersions(year: number): Promise<string[]> {
  const versions: string[] = [];

  for (let month = 1; month <= 12; month++) {
    const version = `${year}.0.${month}`;
    try {
      const url = `${UCDP_BASE_URL}/gedevents/${version}?pagesize=1`;
      const response = await fetch(url, {
        headers: { 'x-ucdp-access-token': env.UCDP_API_TOKEN || '' },
      });

      if (response.ok) {
        const data: UcdpApiResponse = await response.json();
        if (data.TotalCount > 0) {
          versions.push(version);
          logger.info({ version, count: data.TotalCount }, 'UCDP candidate version found');
        }
      } else {
        // Version doesn't exist yet, stop probing
        break;
      }
    } catch {
      break;
    }
  }

  return versions;
}
