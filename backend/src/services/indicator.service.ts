import { prisma } from '../db/client';
import { Prisma } from '@prisma/client';

export interface GdpEntry {
  iso3: string;
  value: number | null;
  year: number | null;
}

/**
 * Fetch latest value for a given indicator code and ISO3 from DB.
 * Returns { value, year } with nulls if not found.
 */
export async function getLatestIndicatorValueForIso3(iso3: string, indicatorCode: string): Promise<{ value: number | null; year: number | null }> {
  try {
    const country = await prisma.entity.findFirst({
      where: {
        type: 'COUNTRY',
        iso3: iso3.toUpperCase()
      },
      select: {
        indicators: {
          where: { indicatorCode, value: { not: null } },
          orderBy: { year: 'desc' },
          take: 1,
          select: { value: true, year: true }
        }
      }
    });
    if (!country || !country.indicators || country.indicators.length === 0) {
      return { value: null, year: null };
    }
    const indicator = country.indicators[0];
    const value = indicator.value !== null && indicator.value !== undefined
      ? Number(indicator.value.toString())
      : null;
    const year = indicator.year ?? null;
    return { value, year };
  } catch (error) {
    console.error(`Error fetching latest indicator ${indicatorCode} for ${iso3} from database:`, error);
    return { value: null, year: null };
  }
}

/**
 * Fetches latest GDP value for each country from database
 * Returns a map of ISO3 -> { iso3, value, year }
 */
export async function getGdpLatestByIso3(): Promise<Record<string, GdpEntry>> {
  try {
    // Get all countries with their latest GDP values
    // Using Prisma's query builder to properly handle enums
    const countries = await prisma.entity.findMany({
      where: {
        type: 'COUNTRY',
        iso3: { not: null },
        indicators: {
          some: {
            indicatorCode: 'GDP_USD',
            value: { not: null }
          }
        }
      },
      select: {
        iso3: true,
        indicators: {
          where: {
            indicatorCode: 'GDP_USD',
            value: { not: null }
          },
          orderBy: {
            year: 'desc'
          },
          take: 1,
          select: {
            value: true,
            year: true
          }
        }
      }
    });

    const byIso3: Record<string, GdpEntry> = {};
    
    for (const country of countries) {
      if (!country.iso3 || country.iso3.length !== 3) continue;
      if (!country.indicators || country.indicators.length === 0) continue;
      
      const iso3 = country.iso3.toUpperCase();
      const indicator = country.indicators[0];
      
      // Convert Prisma.Decimal to number, handling null
      const value = indicator.value !== null && indicator.value !== undefined 
        ? Number(indicator.value.toString()) 
        : null;
      const year = indicator.year ?? null;
      
      byIso3[iso3] = { iso3, value, year };
    }

    console.log(`GDP Service: Found ${Object.keys(byIso3).length} countries with GDP data`);
    return byIso3;
  } catch (error) {
    console.error('Error fetching GDP from database:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return {};
  }
}

/**
 * Fetches latest GDP value for a specific country by ISO3 from database
 */
export async function getGdpByIso3(iso3: string): Promise<GdpEntry | null> {
  try {
    const country = await prisma.entity.findFirst({
      where: {
        type: 'COUNTRY',
        iso3: iso3.toUpperCase()
      },
      select: {
        iso3: true,
        indicators: {
          where: {
            indicatorCode: 'GDP_USD',
            value: { not: null }
          },
          orderBy: {
            year: 'desc'
          },
          take: 1,
          select: {
            value: true,
            year: true
          }
        }
      }
    });

    if (!country || !country.indicators || country.indicators.length === 0) {
      return null;
    }

    const indicator = country.indicators[0];
    const value = indicator.value !== null && indicator.value !== undefined 
      ? Number(indicator.value.toString()) 
      : null;
    const year = indicator.year ?? null;

    return { iso3: country.iso3!.toUpperCase(), value, year };
  } catch (error) {
    console.error(`Error fetching GDP for ${iso3} from database:`, error);
    return null;
  }
}

/**
 * Fetches latest GDP per capita value for each country from database
 * Returns a map of ISO3 -> { iso3, value, year }
 */
export async function getGdpPerCapitaLatestByIso3(): Promise<Record<string, GdpEntry>> {
  try {
    const countries = await prisma.entity.findMany({
      where: {
        type: 'COUNTRY',
        iso3: { not: null },
        indicators: {
          some: {
            indicatorCode: 'GDP_PC_USD',
            value: { not: null }
          }
        }
      },
      select: {
        iso3: true,
        indicators: {
          where: {
            indicatorCode: 'GDP_PC_USD',
            value: { not: null }
          },
          orderBy: {
            year: 'desc'
          },
          take: 1,
          select: {
            value: true,
            year: true
          }
        }
      }
    });

    const byIso3: Record<string, GdpEntry> = {};
    
    for (const country of countries) {
      if (!country.iso3 || country.iso3.length !== 3) continue;
      if (!country.indicators || country.indicators.length === 0) continue;
      
      const iso3 = country.iso3.toUpperCase();
      const indicator = country.indicators[0];
      
      const value = indicator.value !== null && indicator.value !== undefined 
        ? Number(indicator.value.toString()) 
        : null;
      const year = indicator.year ?? null;
      
      byIso3[iso3] = { iso3, value, year };
    }

    console.log(`GDP Per Capita Service: Found ${Object.keys(byIso3).length} countries with GDP per capita data`);
    return byIso3;
  } catch (error) {
    console.error('Error fetching GDP per capita from database:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return {};
  }
}

/**
 * Fetches latest GDP per capita value for a specific country by ISO3 from database
 */
export async function getGdpPerCapitaByIso3(iso3: string): Promise<GdpEntry | null> {
  try {
    const country = await prisma.entity.findFirst({
      where: {
        type: 'COUNTRY',
        iso3: iso3.toUpperCase()
      },
      select: {
        iso3: true,
        indicators: {
          where: {
            indicatorCode: 'GDP_PC_USD',
            value: { not: null }
          },
          orderBy: {
            year: 'desc'
          },
          take: 1,
          select: {
            value: true,
            year: true
          }
        }
      }
    });

    if (!country || !country.indicators || country.indicators.length === 0) {
      return null;
    }

    const indicator = country.indicators[0];
    const value = indicator.value !== null && indicator.value !== undefined 
      ? Number(indicator.value.toString()) 
      : null;
    const year = indicator.year ?? null;

    return { iso3: country.iso3!.toUpperCase(), value, year };
  } catch (error) {
    console.error(`Error fetching GDP per capita for ${iso3} from database:`, error);
    return null;
  }
}

/**
 * Fetches latest Inflation (annual %, CPI YoY) value for each country from database.
 * Supports either 'INFLATION_PCT' (preferred) or 'INFLATION_CPI_YOY_PCT' codes.
 */
export async function getInflationLatestByIso3(): Promise<Record<string, GdpEntry>> {
  try {
    const countries = await prisma.entity.findMany({
      where: {
        type: 'COUNTRY',
        iso3: { not: null },
        indicators: {
          some: {
            indicatorCode: { in: ['INFLATION_PCT', 'INFLATION_CPI_YOY_PCT'] },
            value: { not: null }
          }
        }
      },
      select: {
        iso3: true,
        // Prefer 'INFLATION_PCT' when present; otherwise fallback to the legacy code
        indicators: {
          where: {
            indicatorCode: { in: ['INFLATION_PCT', 'INFLATION_CPI_YOY_PCT'] },
            value: { not: null }
          },
          orderBy: [
            // Sort by preferred code first, then by year desc
            { indicatorCode: 'asc' }, // 'INFLATION_CPI_YOY_PCT' < 'INFLATION_PCT', we will re-order below
            { year: 'desc' }
          ],
          take: 2,
          select: { indicatorCode: true, value: true, year: true }
        }
      }
    });

    const byIso3: Record<string, GdpEntry> = {};
    for (const country of countries) {
      if (!country.iso3 || country.iso3.length !== 3) continue;
      const iso3 = country.iso3.toUpperCase();
      const rows = (country as any).indicators as Array<{ indicatorCode: string; value: Prisma.Decimal | null; year: number | null }>;
      if (!rows || rows.length === 0) continue;
      // Choose preferred row: first try INFLATION_PCT, else fallback
      const preferred = rows.find(r => r.indicatorCode === 'INFLATION_PCT') ?? rows[0];
      const value = preferred.value !== null && preferred.value !== undefined
        ? Number(preferred.value.toString())
        : null;
      const year = preferred.year ?? null;
      byIso3[iso3] = { iso3, value, year };
    }
    console.log(`Inflation Service: Found ${Object.keys(byIso3).length} countries with inflation data`);
    return byIso3;
  } catch (error) {
    console.error('Error fetching Inflation from database:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return {};
  }
}

/**
 * Fetches latest Inflation (annual %, CPI YoY) for a specific country by ISO3 from DB.
 * Supports either 'INFLATION_PCT' (preferred) or 'INFLATION_CPI_YOY_PCT'.
 */
export async function getInflationByIso3(iso3: string): Promise<GdpEntry | null> {
  try {
    const country = await prisma.entity.findFirst({
      where: { type: 'COUNTRY', iso3: iso3.toUpperCase() },
      select: {
        iso3: true,
        indicators: {
          where: {
            indicatorCode: { in: ['INFLATION_PCT', 'INFLATION_CPI_YOY_PCT'] },
            value: { not: null }
          },
          orderBy: [
            { indicatorCode: 'asc' },
            { year: 'desc' }
          ],
          take: 2,
          select: { indicatorCode: true, value: true, year: true }
        }
      }
    });
    if (!country || !country.indicators || country.indicators.length === 0) {
      return null;
    }
    const rows = (country as any).indicators as Array<{ indicatorCode: string; value: Prisma.Decimal | null; year: number | null }>;
    const preferred = rows.find(r => r.indicatorCode === 'INFLATION_PCT') ?? rows[0];
    const value = preferred.value !== null && preferred.value !== undefined
      ? Number(preferred.value.toString())
      : null;
    const year = preferred.year ?? null;
    return { iso3: country.iso3!.toUpperCase(), value, year };
  } catch (error) {
    console.error(`Error fetching Inflation for ${iso3} from database:`, error);
    return null;
  }
}

/**
 * Mapping of frontend slugs to database indicator codes
 */
const SLUG_TO_CODE: Record<string, string> = {
  'gdp': 'GDP_USD',
  'gdp-per-capita': 'GDP_PC_USD',
  'inflation': 'INFLATION_CPI_YOY_PCT',
  'gini': 'GINI_INDEX',
  'exports': 'EXPORTS_USD',
  'imports': 'IMPORTS_USD',
  'unemployment': 'UNEMPLOYMENT_RATE_PERCENT',
  'debt': 'EXTERNAL_DEBT_USD',
  // New indicators for Statistics panel
  'life-expectancy': 'LIFE_EXPECTANCY',
  'population-density': 'POPULATION_DENSITY',
  'population-growth': 'POPULATION_GROWTH',
  'military-expenditure': 'MILITARY_EXPENDITURE_PCT_GDP',
  'democracy-index': 'WGI_VOICE_ACCOUNTABILITY', // Will be normalized in frontend
  'trade-gdp': 'TRADE_PERCENT_GDP'
};

/**
 * Get latest indicator value for all countries by slug (generic endpoint)
 */
export async function getIndicatorLatestBySlug(slug: string): Promise<Record<string, GdpEntry>> {
  const indicatorCode = SLUG_TO_CODE[slug.toLowerCase()];
  if (!indicatorCode) {
    console.warn(`Unknown indicator slug: ${slug}`);
    return {};
  }

  try {
    const countries = await prisma.entity.findMany({
      where: {
        type: 'COUNTRY',
        iso3: { not: null },
        indicators: {
          some: {
            indicatorCode,
            value: { not: null }
          }
        }
      },
      select: {
        iso3: true,
        indicators: {
          where: {
            indicatorCode,
            value: { not: null }
          },
          orderBy: {
            year: 'desc'
          },
          take: 1,
          select: {
            value: true,
            year: true
          }
        }
      }
    });

    const byIso3: Record<string, GdpEntry> = {};
    
    for (const country of countries) {
      if (!country.iso3 || country.iso3.length !== 3) continue;
      if (!country.indicators || country.indicators.length === 0) continue;
      
      const iso3 = country.iso3.toUpperCase();
      const indicator = country.indicators[0];
      
      const value = indicator.value !== null && indicator.value !== undefined 
        ? Number(indicator.value.toString()) 
        : null;
      const year = indicator.year ?? null;
      
      byIso3[iso3] = { iso3, value, year };
    }

    console.log(`Indicator ${slug} (${indicatorCode}): Found ${Object.keys(byIso3).length} countries with data`);
    return byIso3;
  } catch (error) {
    console.error(`Error fetching indicator ${slug} (${indicatorCode}) from database:`, error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return {};
  }
}

/**
 * Get full time series for a specific indicator and country
 * Returns array of { year, value } sorted by year ascending
 */
export async function getIndicatorTimeSeries(
  iso3: string,
  indicatorCode: string,
  startYear?: number,
  endYear?: number
): Promise<Array<{ year: number; value: number | null }>> {
  try {
    const country = await prisma.entity.findFirst({
      where: {
        type: 'COUNTRY',
        iso3: iso3.toUpperCase()
      },
      select: {
        id: true,
        indicators: {
          where: {
            indicatorCode,
            ...(startYear || endYear ? {
              year: {
                ...(startYear ? { gte: startYear } : {}),
                ...(endYear ? { lte: endYear } : {})
              }
            } : {})
          },
          orderBy: { year: 'asc' },
          select: {
            year: true,
            value: true
          }
        }
      }
    });

    if (!country || !country.indicators || country.indicators.length === 0) {
      return [];
    }

    return country.indicators.map(ind => ({
      year: ind.year,
      value: ind.value !== null && ind.value !== undefined
        ? Number(ind.value.toString())
        : null
    }));
  } catch (error) {
    console.error(`Error fetching time series for ${indicatorCode} (${iso3}):`, error);
    return [];
  }
}

