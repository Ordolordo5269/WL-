import axios from 'axios';
import type {
  UcdpApiResponse,
  RawGedEvent,
  RawConflict,
  RawBattleDeaths,
  RawNonState,
  RawOneSided,
  GedEventFilters,
  ConflictFilters,
  BattleDeathsFilters,
  NonStateFilters,
  OneSidedFilters,
  PaginationParams,
} from './types.js';

const BASE_URL = 'https://ucdpapi.pcr.uu.se/api/';
const DEFAULT_VERSION = '25.1';
const DEFAULT_PAGE_SIZE = 1000;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
    ...(process.env.UCDP_API_TOKEN
      ? { 'x-ucdp-access-token': process.env.UCDP_API_TOKEN }
      : {}),
  },
});

// ============================
// Generic paginated fetcher
// ============================

/**
 * Fetch a single page from any UCDP endpoint.
 * Returns the full paginated response wrapper.
 */
async function fetchPage<T>(
  endpoint: string,
  version: string,
  params: Record<string, string | number | undefined> = {},
  page = 0,
  pagesize = DEFAULT_PAGE_SIZE,
): Promise<UcdpApiResponse<T>> {
  const { data } = await api.get<UcdpApiResponse<T>>(
    `${endpoint}/${version}`,
    {
      params: { ...params, page, pagesize },
    },
  );
  return data;
}

/**
 * Fetch ALL pages from any UCDP endpoint, following pagination automatically.
 * Yields arrays of results page-by-page so callers can stream inserts.
 */
export async function* fetchAllPages<T>(
  endpoint: string,
  version: string = DEFAULT_VERSION,
  params: Record<string, string | number | undefined> = {},
  pagesize: number = DEFAULT_PAGE_SIZE,
): AsyncGenerator<{ results: T[]; totalCount: number; page: number; totalPages: number }> {
  let page = 0;
  let totalPages = 1; // will be set after first request

  while (page < totalPages) {
    const response = await fetchPage<T>(endpoint, version, params, page, pagesize);
    totalPages = response.TotalPages;

    yield {
      results: response.Result,
      totalCount: response.TotalCount,
      page,
      totalPages,
    };

    page++;
  }
}

// ============================
// Typed endpoint fetchers
// ============================

/** Fetch georeferenced events (GED) */
export async function fetchGedEvents(
  params: GedEventFilters & PaginationParams = {},
  version: string = DEFAULT_VERSION,
): Promise<UcdpApiResponse<RawGedEvent>> {
  const { pagesize = DEFAULT_PAGE_SIZE, page = 0, ...filters } = params;
  return fetchPage<RawGedEvent>('gedevents', version, filters, page, pagesize);
}

/** Fetch armed conflicts (UCDP/PRIO Armed Conflict Dataset) */
export async function fetchConflicts(
  params: ConflictFilters & PaginationParams = {},
  version: string = DEFAULT_VERSION,
): Promise<UcdpApiResponse<RawConflict>> {
  const { pagesize = DEFAULT_PAGE_SIZE, page = 0, ...filters } = params;
  return fetchPage<RawConflict>('ucdpprioconflict', version, filters, page, pagesize);
}

/** Fetch battle-related deaths */
export async function fetchBattleDeaths(
  params: BattleDeathsFilters & PaginationParams = {},
  version: string = DEFAULT_VERSION,
): Promise<UcdpApiResponse<RawBattleDeaths>> {
  const { pagesize = DEFAULT_PAGE_SIZE, page = 0, ...filters } = params;
  return fetchPage<RawBattleDeaths>('battledeaths', version, filters, page, pagesize);
}

/** Fetch non-state conflict data */
export async function fetchNonState(
  params: NonStateFilters & PaginationParams = {},
  version: string = DEFAULT_VERSION,
): Promise<UcdpApiResponse<RawNonState>> {
  const { pagesize = DEFAULT_PAGE_SIZE, page = 0, ...filters } = params;
  return fetchPage<RawNonState>('nonstate', version, filters, page, pagesize);
}

/** Fetch one-sided violence data */
export async function fetchOneSided(
  params: OneSidedFilters & PaginationParams = {},
  version: string = DEFAULT_VERSION,
): Promise<UcdpApiResponse<RawOneSided>> {
  const { pagesize = DEFAULT_PAGE_SIZE, page = 0, ...filters } = params;
  return fetchPage<RawOneSided>('onesided', version, filters, page, pagesize);
}

// ============================
// Candidate version detection
// ============================

/**
 * Probe the UCDP API to find the latest available candidate version (26.0.X).
 * Tries versions from high to low and returns the first that responds.
 */
export async function detectLatestCandidateVersion(): Promise<string | null> {
  // Candidate versions are published monthly as 26.0.1, 26.0.2, etc.
  // Probe from high to low to find the latest
  for (let minor = 12; minor >= 1; minor--) {
    const version = `26.0.${minor}`;
    try {
      const response = await api.get(`gedevents/${version}`, {
        params: { pagesize: 1 },
        timeout: 10_000,
      });
      if (response.data?.TotalCount > 0) {
        return version;
      }
    } catch {
      // Version doesn't exist, try next
    }
  }
  return null;
}
