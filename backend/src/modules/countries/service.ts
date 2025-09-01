import { memoryCache } from '../../core/cache/memoryCache';
import { restCountriesClient } from './clients/restCountries.client';
import { CountryBasicInfo, CountryBasicInfoResponse, CountrySearchResponse } from '../../types/country.types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function listAllCountries(): Promise<CountrySearchResponse> {
  const cacheKey = 'countries:all';
  const cached = memoryCache.get<CountryBasicInfo[]>(cacheKey);
  if (cached) return { data: cached, total: cached.length };

  const data = await restCountriesClient.all();
  memoryCache.set(cacheKey, data, ONE_DAY_MS);
  return { data, total: data.length };
}

export async function findCountriesByName(query: string): Promise<CountrySearchResponse> {
  if (!query || query.trim().length < 2) return { data: [], total: 0 };
  const cacheKey = `countries:search:${query.toLowerCase()}`;
  const cached = memoryCache.get<CountryBasicInfo[]>(cacheKey);
  if (cached) return { data: cached.slice(0, 10), total: cached.length };

  const data = await restCountriesClient.byName(query);
  memoryCache.set(cacheKey, data, ONE_DAY_MS);
  return { data: data.slice(0, 10), total: data.length };
}

export async function getCountryByIsoCode(code: string): Promise<CountryBasicInfoResponse> {
  const normalized = (code || '').toUpperCase();
  const cacheKey = `countries:code:${normalized}`;
  const cached = memoryCache.get<CountryBasicInfo>(cacheKey);
  if (cached) return { data: cached };

  const arr = await restCountriesClient.byCode(normalized);
  const country = Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;
  if (!country) return { error: `Country with code '${code}' not found` };
  memoryCache.set(cacheKey, country, ONE_DAY_MS);
  return { data: country };
}

export async function getCountryBasicInfoByName(name: string): Promise<CountryBasicInfoResponse> {
  const query = (name || '').trim();
  if (!query) return { error: 'Country name required' };
  const cacheKeyExact = `countries:name:${query.toLowerCase()}:full`;

  const cachedExact = memoryCache.get<CountryBasicInfo>(cacheKeyExact);
  if (cachedExact) return { data: cachedExact };

  try {
    const exact = await restCountriesClient.byNameFullText(query);
    if (exact && exact.length > 0) {
      const c = exact[0] as CountryBasicInfo;
      memoryCache.set(cacheKeyExact, c, ONE_DAY_MS);
      return { data: c };
    }
  } catch (_err) {
    // fall through to partial search
  }

  const partialKey = `countries:name:${query.toLowerCase()}:partial`;
  const cachedPartial = memoryCache.get<CountryBasicInfo>(partialKey);
  if (cachedPartial) return { data: cachedPartial };

  const list = await restCountriesClient.byName(query);
  if (!list || list.length === 0) return { error: `Country '${query}' not found` };
  const best = (list as CountryBasicInfo[]).find(c =>
    c.name?.common?.toLowerCase() === query.toLowerCase() ||
    c.name?.official?.toLowerCase() === query.toLowerCase()
  ) || list[0];
  memoryCache.set(partialKey, best, ONE_DAY_MS);
  return { data: best };
}



