import { prisma } from '../db/client';
import { logger } from '../core/logger';

// ============================
// Types
// ============================

export interface GeoCity {
  id: number;
  wikiDataId: string;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  latitude: number;
  longitude: number;
  population: number;
  elevationMeters: number | null;
}

export interface GeoRegion {
  isoCode: string;
  fipsCode: string | null;
  name: string;
  countryCode: string;
  wikiDataId: string | null;
}

interface GeoCacheEntry {
  id: string;
  type: string;
  iso2: string;
  data: unknown;
  expiresAt: Date;
}

// ============================
// Configuration
// ============================

// Free tier (no API key required, but may have limited availability)
const GEODB_FREE_URL = 'https://geodb-free-service.wirefreethought.com/v1';

// RapidAPI (requires API key, more reliable)
const RAPIDAPI_HOST = 'wft-geo-db.p.rapidapi.com';
const RAPIDAPI_URL = 'https://wft-geo-db.p.rapidapi.com/v1';

// Dynamic getters to ensure env vars are read after dotenv loads
function getRapidApiKey(): string {
  return process.env.RAPIDAPI_KEY || '';
}

function useRapidApi(): boolean {
  return !!getRapidApiKey();
}

// Cache TTLs in milliseconds
const CITIES_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REGIONS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ============================
// HTTP Client with Rate Limiting
// ============================

async function fetchFromGeoDB<T>(endpoint: string): Promise<T | null> {
  const apiKey = getRapidApiKey();
  const isRapidApi = useRapidApi();

  try {
    let url: string;
    let headers: Record<string, string> = {};

    if (isRapidApi) {
      // RapidAPI version (more reliable, requires key)
      url = `${RAPIDAPI_URL}${endpoint}`;
      headers = {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      };
      logger.debug(`Fetching from GeoDB (RapidAPI): ${endpoint}`);
    } else {
      // Free tier (no API key, may be unavailable)
      url = `${GEODB_FREE_URL}${endpoint}`;
      logger.debug(`Fetching from GeoDB (Free): ${endpoint}`);
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      
      if (response.status === 429) {
        logger.warn('GeoDB API rate limit reached');
        return null;
      }
      if (response.status === 503) {
        logger.warn('GeoDB Free API temporarily unavailable (503). Consider using RapidAPI with RAPIDAPI_KEY env var.');
        return null;
      }
      if (response.status === 403) {
        logger.error('GeoDB API: Invalid or missing API key');
        return null;
      }
      logger.error(`GeoDB API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    logger.error('Failed to fetch from GeoDB API', {
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

// ============================
// Cache Operations
// ============================

async function getCacheEntry(cacheId: string): Promise<GeoCacheEntry | null> {
  try {
    const entry = await prisma.geoCache.findUnique({
      where: { id: cacheId },
    });

    if (!entry) return null;

    // Check if expired
    if (new Date() > entry.expiresAt) {
      logger.debug(`Cache entry expired: ${cacheId}`);
      return null;
    }

    return entry as GeoCacheEntry;
  } catch (error) {
    logger.error('Failed to read geo cache', {
      cacheId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

async function setCacheEntry(
  cacheId: string,
  type: string,
  iso2: string,
  data: unknown,
  ttlMs: number
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMs);
    await prisma.geoCache.upsert({
      where: { id: cacheId },
      update: {
        data: data as any,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        id: cacheId,
        type,
        iso2: iso2.toUpperCase(),
        data: data as any,
        expiresAt,
      },
    });
    logger.debug(`Cache updated: ${cacheId}, expires at ${expiresAt.toISOString()}`);
  } catch (error) {
    logger.error('Failed to write geo cache', {
      cacheId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================
// Public API Functions
// ============================

/**
 * Get top cities for a country (cached)
 */
export async function getCitiesByCountry(iso2: string, limit: number = 10): Promise<GeoCity[]> {
  const normalizedIso2 = iso2.toUpperCase();
  const cacheId = `cities:${normalizedIso2}`;

  // Try cache first
  const cached = await getCacheEntry(cacheId);
  if (cached) {
    logger.debug(`Cache hit for cities: ${normalizedIso2}`);
    return (cached.data as GeoCity[]).slice(0, limit);
  }

  // Fetch from API
  interface GeoDBPlacesResponse {
    data: Array<{
      id: number;
      wikiDataId: string;
      name: string;
      country: string;
      countryCode: string;
      region: string;
      regionCode: string;
      latitude: number;
      longitude: number;
      population: number;
      elevationMeters: number | null;
    }>;
  }

  // Free tier limit is 5, basic is 10
  const apiLimit = Math.min(limit, 5);
  const response = await fetchFromGeoDB<GeoDBPlacesResponse>(
    `/geo/countries/${normalizedIso2}/places?types=CITY&sort=-population&limit=${apiLimit}&offset=0`
  );

  if (!response?.data) {
    logger.warn(`No cities data for ${normalizedIso2}`);
    return [];
  }

  const cities: GeoCity[] = response.data.map((city) => ({
    id: city.id,
    wikiDataId: city.wikiDataId,
    name: city.name,
    country: city.country,
    countryCode: city.countryCode,
    region: city.region || '',
    regionCode: city.regionCode || '',
    latitude: city.latitude,
    longitude: city.longitude,
    population: city.population || 0,
    elevationMeters: city.elevationMeters,
  }));

  // Cache the result
  await setCacheEntry(cacheId, 'cities', normalizedIso2, cities, CITIES_TTL_MS);

  return cities;
}

/**
 * Get administrative regions for a country (cached)
 */
export async function getRegionsByCountry(iso2: string): Promise<GeoRegion[]> {
  const normalizedIso2 = iso2.toUpperCase();
  const cacheId = `regions:${normalizedIso2}`;

  // Try cache first
  const cached = await getCacheEntry(cacheId);
  if (cached) {
    logger.debug(`Cache hit for regions: ${normalizedIso2}`);
    return cached.data as GeoRegion[];
  }

  // Fetch from API
  interface GeoDBRegionsResponse {
    data: Array<{
      isoCode: string;
      fipsCode: string | null;
      name: string;
      countryCode: string;
      wikiDataId: string | null;
    }>;
  }

  const response = await fetchFromGeoDB<GeoDBRegionsResponse>(
    `/geo/countries/${normalizedIso2}/regions?limit=5`
  );

  if (!response?.data) {
    logger.warn(`No regions data for ${normalizedIso2}`);
    return [];
  }

  const regions: GeoRegion[] = response.data.map((region) => ({
    isoCode: region.isoCode || '',
    fipsCode: region.fipsCode,
    name: region.name,
    countryCode: region.countryCode,
    wikiDataId: region.wikiDataId,
  }));

  // Cache the result
  await setCacheEntry(cacheId, 'regions', normalizedIso2, regions, REGIONS_TTL_MS);

  return regions;
}

/**
 * Get details for a specific place
 */
export async function getPlaceDetails(placeId: string): Promise<GeoCity | null> {
  interface GeoDBPlaceResponse {
    data: {
      id: number;
      wikiDataId: string;
      name: string;
      country: string;
      countryCode: string;
      region: string;
      regionCode: string;
      latitude: number;
      longitude: number;
      population: number;
      elevationMeters: number | null;
    };
  }

  const response = await fetchFromGeoDB<GeoDBPlaceResponse>(`/geo/places/${placeId}`);

  if (!response?.data) {
    return null;
  }

  const place = response.data;
  return {
    id: place.id,
    wikiDataId: place.wikiDataId,
    name: place.name,
    country: place.country,
    countryCode: place.countryCode,
    region: place.region || '',
    regionCode: place.regionCode || '',
    latitude: place.latitude,
    longitude: place.longitude,
    population: place.population || 0,
    elevationMeters: place.elevationMeters,
  };
}

/**
 * Search places globally (with country filter for efficiency)
 */
export async function searchPlaces(
  query: string,
  countryCode?: string,
  limit: number = 10
): Promise<GeoCity[]> {
  if (!query || query.length < 2) return [];

  let endpoint = `/geo/places?namePrefix=${encodeURIComponent(query)}&types=CITY&sort=-population&limit=${limit}`;
  
  if (countryCode) {
    endpoint += `&countryIds=${countryCode.toUpperCase()}`;
  }

  interface GeoDBPlacesResponse {
    data: Array<{
      id: number;
      wikiDataId: string;
      name: string;
      country: string;
      countryCode: string;
      region: string;
      regionCode: string;
      latitude: number;
      longitude: number;
      population: number;
      elevationMeters: number | null;
    }>;
  }

  const response = await fetchFromGeoDB<GeoDBPlacesResponse>(endpoint);

  if (!response?.data) {
    return [];
  }

  return response.data.map((city) => ({
    id: city.id,
    wikiDataId: city.wikiDataId,
    name: city.name,
    country: city.country,
    countryCode: city.countryCode,
    region: city.region || '',
    regionCode: city.regionCode || '',
    latitude: city.latitude,
    longitude: city.longitude,
    population: city.population || 0,
    elevationMeters: city.elevationMeters,
  }));
}

/**
 * Force refresh cache for a country
 */
export async function refreshCache(iso2: string): Promise<{ cities: number; regions: number }> {
  const normalizedIso2 = iso2.toUpperCase();

  // Delete existing cache entries
  await prisma.geoCache.deleteMany({
    where: { iso2: normalizedIso2 },
  });

  // Fetch fresh data
  const cities = await getCitiesByCountry(normalizedIso2, 20);
  const regions = await getRegionsByCountry(normalizedIso2);

  return {
    cities: cities.length,
    regions: regions.length,
  };
}

/**
 * Get cache status for monitoring
 */
export async function getCacheStatus(): Promise<{
  totalEntries: number;
  expiredEntries: number;
  countriesCached: string[];
}> {
  const now = new Date();

  const entries = await prisma.geoCache.findMany({
    select: { iso2: true, expiresAt: true },
  });

  const expiredCount = entries.filter((e) => e.expiresAt < now).length;
  const uniqueCountries = [...new Set(entries.map((e) => e.iso2))];

  return {
    totalEntries: entries.length,
    expiredEntries: expiredCount,
    countriesCached: uniqueCountries,
  };
}


