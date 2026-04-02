import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const BASE_URL = 'https://api.joshuaproject.net/v1';
const MAX_RETRIES = 3;
const PAGE_SIZE = 5000; // JP hard-caps at 5000 per request

// ── Raw response types ──────────────────────────────────────────────

export interface JPRawLanguage {
  ROL3: string;
  Language: string;
  Status: string | null;
  ROG3: string | null;
  HubCountry: string | null;
  NbrPGICs: number | null;
  NbrCountries: number | null;
  PrimaryReligion: string | null;
  PercentAdherents: number | null;
  PercentEvangelical: number | null;
}

export interface JPRawCountry {
  Ctry: string;
  ISO2: string;
  ISO3: string;
  ROG3: string;
  Population: number;
  Capital: string;
  OfficialLang: string;
  ROL3OfficialLanguage: string;
  ReligionPrimary: string;
  PercentChristianity: number;
  PercentIslam: number;
  PercentBuddhism: number;
  PercentHinduism: number;
  PercentEthnicReligions: number;
  PercentNonReligious: number;
  PercentOtherSmall: number;
  PercentUnknown: number;
}

export interface JPRawPeopleGroup {
  PeopleID3: number;
  PeopNameInCountry: string;
  ROG3: string;
  ISO3: string;
  Ctry: string;
  ROL3: string;
  PrimaryLanguageName: string;
  Population: number;
  PopulationPGAC: number;
  Latitude: number;
  Longitude: number;
  AffinityBloc: string;
  PeopleCluster: string;
}

// ── Fetch with retry ────────────────────────────────────────────────

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;

      if (response.status === 429 && attempt < retries) {
        const wait = Math.pow(2, attempt) * 1000;
        logger.warn({ attempt, wait }, 'Joshua Project rate limited, retrying...');
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      throw new Error(`Joshua Project API returned ${response.status}: ${response.statusText}`);
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = Math.pow(2, attempt) * 1000;
      logger.warn({ attempt, err }, 'JP fetch failed, retrying...');
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error('JP fetch exhausted retries');
}

// ── Public fetch functions ──────────────────────────────────────────

function apiKey(): string {
  const key = env.JOSHUA_PROJECT_API_KEY;
  if (!key) throw new Error('JOSHUA_PROJECT_API_KEY not set');
  return key;
}

export async function fetchLanguages(): Promise<JPRawLanguage[]> {
  const all: JPRawLanguage[] = [];

  // JP caps at 5000/page, total is ~7134
  for (let page = 1; page <= 3; page++) {
    const url = `${BASE_URL}/languages.json?api_key=${apiKey()}&limit=${PAGE_SIZE}&page=${page}`;
    logger.info({ page }, 'Fetching JP languages page');
    const response = await fetchWithRetry(url);
    const data: JPRawLanguage[] = await response.json();
    if (data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  logger.info({ total: all.length }, 'JP languages fetched');
  return all;
}

export async function fetchCountries(): Promise<JPRawCountry[]> {
  const url = `${BASE_URL}/countries.json?api_key=${apiKey()}&limit=500`;
  logger.info('Fetching JP countries');
  const response = await fetchWithRetry(url);
  const data: JPRawCountry[] = await response.json();
  logger.info({ total: data.length }, 'JP countries fetched');
  return data;
}

export async function fetchPeopleGroups(): Promise<JPRawPeopleGroup[]> {
  const all: JPRawPeopleGroup[] = [];
  const fields = 'PeopleID3|PeopNameInCountry|ROG3|ISO3|Ctry|ROL3|PrimaryLanguageName|Population|PopulationPGAC|Latitude|Longitude|AffinityBloc|PeopleCluster';

  for (let page = 1; page <= 5; page++) {
    const url = `${BASE_URL}/people_groups.json?api_key=${apiKey()}&limit=${PAGE_SIZE}&page=${page}&fields=${fields}`;
    logger.info({ page }, 'Fetching JP people groups page');
    const response = await fetchWithRetry(url);
    const data: JPRawPeopleGroup[] = await response.json();
    if (data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  logger.info({ total: all.length }, 'JP people groups fetched');
  return all;
}
