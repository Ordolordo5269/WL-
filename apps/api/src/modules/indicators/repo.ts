import { prisma } from '../../db/client';
import { Prisma } from '@prisma/client';
import type { GdpEntry } from './types';

/**
 * Fetch latest value for a given indicator code and ISO3 from DB.
 */
export async function findLatestIndicator(iso3: string, indicatorCode: string): Promise<{ value: number | null; year: number | null }> {
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
 * Fetch latest values for a given indicator code across all countries.
 */
export async function findAllLatestByCode(indicatorCode: string): Promise<Record<string, GdpEntry>> {
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
          orderBy: { year: 'desc' },
          take: 1,
          select: { value: true, year: true }
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
    return byIso3;
  } catch (error) {
    console.error(`Error fetching all latest for ${indicatorCode}:`, error);
    return {};
  }
}

/**
 * Fetch latest inflation values supporting both INFLATION_PCT and INFLATION_CPI_YOY_PCT codes.
 */
export async function findAllLatestInflation(): Promise<Record<string, GdpEntry>> {
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

    const byIso3: Record<string, GdpEntry> = {};
    for (const country of countries) {
      if (!country.iso3 || country.iso3.length !== 3) continue;
      const iso3 = country.iso3.toUpperCase();
      const rows = (country as any).indicators as Array<{ indicatorCode: string; value: Prisma.Decimal | null; year: number | null }>;
      if (!rows || rows.length === 0) continue;
      const preferred = rows.find(r => r.indicatorCode === 'INFLATION_PCT') ?? rows[0];
      const value = preferred.value !== null && preferred.value !== undefined
        ? Number(preferred.value.toString())
        : null;
      const year = preferred.year ?? null;
      byIso3[iso3] = { iso3, value, year };
    }
    return byIso3;
  } catch (error) {
    console.error('Error fetching Inflation from database:', error);
    return {};
  }
}

/**
 * Fetch inflation for a single country (supports both codes).
 */
export async function findInflationByIso3(iso3: string): Promise<GdpEntry | null> {
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
 * Fetch latest value for a single country by indicator code.
 */
export async function findByIso3AndCode(iso3: string, indicatorCode: string): Promise<GdpEntry | null> {
  try {
    const country = await prisma.entity.findFirst({
      where: { type: 'COUNTRY', iso3: iso3.toUpperCase() },
      select: {
        iso3: true,
        indicators: {
          where: { indicatorCode, value: { not: null } },
          orderBy: { year: 'desc' },
          take: 1,
          select: { value: true, year: true }
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
    console.error(`Error fetching ${indicatorCode} for ${iso3} from database:`, error);
    return null;
  }
}

/**
 * Fetch time series for a specific indicator and country.
 */
export async function findTimeSeries(
  iso3: string,
  indicatorCode: string,
  startYear?: number,
  endYear?: number
): Promise<Array<{ year: number; value: number | null }>> {
  try {
    const country = await prisma.entity.findFirst({
      where: { type: 'COUNTRY', iso3: iso3.toUpperCase() },
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
          select: { year: true, value: true }
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

/**
 * Find a country entity by ISO3.
 */
export async function findCountryEntity(iso3: string) {
  return prisma.entity.findFirst({
    where: { type: 'COUNTRY', iso3: iso3.toUpperCase() },
    select: { id: true, name: true, region: true, props: true, iso3: true }
  });
}
