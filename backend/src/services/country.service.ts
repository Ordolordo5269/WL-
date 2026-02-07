import { prisma } from '../db/client';
import { CountryBasicInfo, CountrySearchResponse, CountryBasicInfoResponse } from '../types/country.types';
import { logger } from '../core/logger';

/**
 * ISO3 to ISO2 mapping for flag codes (common countries)
 */
const ISO3_TO_ISO2: Record<string, string> = {
  'USA': 'us', 'CHN': 'cn', 'JPN': 'jp', 'DEU': 'de', 'IND': 'in',
  'GBR': 'gb', 'FRA': 'fr', 'ITA': 'it', 'BRA': 'br', 'CAN': 'ca',
  'KOR': 'kr', 'ESP': 'es', 'AUS': 'au', 'MEX': 'mx', 'IDN': 'id',
  'NLD': 'nl', 'SAU': 'sa', 'TUR': 'tr', 'CHE': 'ch', 'POL': 'pl',
  'BEL': 'be', 'ARG': 'ar', 'SWE': 'se', 'THA': 'th', 'IRN': 'ir',
  'EGY': 'eg', 'PAK': 'pk', 'BGD': 'bd', 'VNM': 'vn', 'PHL': 'ph',
  'ZAF': 'za', 'NGA': 'ng', 'KEN': 'ke', 'COL': 'co', 'CHL': 'cl',
  'PER': 'pe', 'ROU': 'ro', 'CZE': 'cz', 'HUN': 'hu', 'GRC': 'gr',
  'PRT': 'pt', 'DNK': 'dk', 'FIN': 'fi', 'NOR': 'no', 'IRL': 'ie',
  'NZL': 'nz', 'SGP': 'sg', 'MYS': 'my', 'ARE': 'ae', 'QAT': 'qa',
  'ISR': 'il', 'UKR': 'ua', 'RUS': 'ru', 'KAZ': 'kz', 'UZB': 'uz'
};

const COUNTRY_SELECT_FIELDS = {
  name: true,
  iso3: true,
  iso2: true,
  region: true,
  subregion: true,
  props: true,
};

function slugifyCountryName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapEntityToCountryBasicInfo(entity: {
  name: string | null;
  iso3: string | null;
  iso2: string | null;
  region: string | null;
  subregion?: string | null;
  props?: any;
}): CountryBasicInfo | null {
  if (!entity.iso3) return null;
  const iso3 = entity.iso3.toUpperCase();
  const iso2 = (entity.iso2 || ISO3_TO_ISO2[iso3] || iso3.slice(0, 2)).toUpperCase();
  const props = entity.props || {};
  const population = props.population ?? null;
  const area = props.area ?? null;
  return {
    name: {
      common: entity.name || 'Unknown',
      official: entity.name || 'Unknown'
    },
    cca3: iso3,
    cca2: iso2,
    region: entity.region || 'Unknown',
    subregion: entity.subregion || undefined,
    area: typeof area === 'number' ? area : null,
    population: typeof population === 'number' ? population : null,
    capital: props.capital ? [props.capital] : undefined,
    flags: {
      png: `https://flagcdn.com/w320/${iso2.toLowerCase()}.png`,
      svg: `https://flagcdn.com/${iso2.toLowerCase()}.svg`
    }
  } as CountryBasicInfo;
}

export async function getCountriesFromDatabase(): Promise<CountryBasicInfo[]> {
  try {
    const entities = await prisma.entity.findMany({
      where: {
        type: 'COUNTRY',
        iso3: { not: null }
      },
      select: {
        name: true,
        iso3: true,
        iso2: true,
        region: true,
        subregion: true,
        props: true
      },
      orderBy: { name: 'asc' },
      take: 300
    });

    const mapped = entities
      .map(mapEntityToCountryBasicInfo)
      .filter((c): c is CountryBasicInfo => Boolean(c));

    if (mapped.length === 0) {
      logger.debug('No countries found in database');
    }

    return mapped;
  } catch (error) {
    logger.error('Error fetching countries from database', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
}

export async function getCountryBasicInfo(countryName: string): Promise<CountryBasicInfoResponse> {
  const query = (countryName || '').trim();
  if (!query) return { error: 'Country name required' };

  const normalizedSlug = slugifyCountryName(query);
  const normalizedUpper = query.toUpperCase();

  try {
    // First, try to find an exact match to avoid returning a different region (e.g., Hong Kong vs China)
    const exactEntity = await prisma.entity.findFirst({
      where: {
        type: 'COUNTRY',
        OR: [
          { name: { equals: query, mode: 'insensitive' } },
          { slug: { equals: normalizedSlug } },
          { iso3: { equals: normalizedUpper } },
          { iso2: { equals: normalizedUpper } },
        ],
      },
      select: COUNTRY_SELECT_FIELDS,
    });

    if (exactEntity) {
      const mapped = mapEntityToCountryBasicInfo(exactEntity);
      if (mapped) return { data: mapped };
    }

    // Fallback: use partial match but prefer the shortest name to reduce false positives
    const partialMatches = await prisma.entity.findMany({
      where: {
        type: 'COUNTRY',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: normalizedSlug } },
        ],
      },
      select: COUNTRY_SELECT_FIELDS,
      orderBy: { name: 'asc' },
      take: 5,
    });

    const bestPartial = partialMatches.sort((a, b) => a.name.length - b.name.length)[0];
    if (bestPartial) {
      const mapped = mapEntityToCountryBasicInfo(bestPartial);
      if (mapped) return { data: mapped };
    }

    return { error: `Country '${countryName}' not found` };
  } catch (error) {
    logger.error('Error fetching country basic info from database', {
      countryName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { error: 'Failed to fetch country information' };
  }
}

export async function searchCountries(query: string): Promise<CountrySearchResponse> {
  if (!query || query.trim().length < 2) {
    return { data: [], total: 0 };
  }
  try {
    const results = await prisma.entity.findMany({
      where: {
        type: 'COUNTRY',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { iso3: { contains: query.toUpperCase() } },
          { iso2: { contains: query.toUpperCase() } },
        ],
      },
      select: {
        name: true,
        iso3: true,
        iso2: true,
        region: true,
        subregion: true,
        props: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
    const mapped = results
      .map(mapEntityToCountryBasicInfo)
      .filter((c): c is CountryBasicInfo => Boolean(c));

    return { data: mapped.slice(0, 10), total: mapped.length };
  } catch (error) {
    logger.error('Error searching countries in database', {
      query,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { data: [], total: 0, error: 'Failed to search countries' };
  }
}

export async function getCountryByCode(code: string): Promise<CountryBasicInfoResponse> {
  const normalized = (code || '').toUpperCase();
  if (!normalized) return { error: 'Country code required' };

  try {
    const entity = await prisma.entity.findFirst({
      where: {
        type: 'COUNTRY',
        OR: [{ iso3: normalized }, { iso2: normalized }],
      },
      select: {
        name: true,
        iso3: true,
        iso2: true,
        region: true,
        subregion: true,
        props: true,
      },
    });
    if (!entity) {
      return { error: `Country with code '${code}' not found` };
    }
    const mapped = mapEntityToCountryBasicInfo(entity);
    return mapped ? { data: mapped } : { error: `Country with code '${code}' not found` };
  } catch (error) {
    logger.error('Error fetching country by code from database', {
      code,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { error: 'Failed to fetch country information' };
  }
}

export async function getAllCountries(): Promise<CountrySearchResponse> {
  try {
    const dbCountries = await getCountriesFromDatabase();
    return {
      data: dbCountries,
      total: dbCountries.length
    };
  } catch (error) {
    logger.error('Error fetching all countries from database', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { data: [], total: 0, error: 'Failed to fetch countries from database' };
  }
}
