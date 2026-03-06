import { Request, Response, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { getLatestIndicatorValueForIso3 } from '../services/indicator.service';

type LatestPoint = { value: number | null; year: number | null };

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const getSocietyByIso3: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }

    const entity = await prisma.entity.findFirst({
      where: { type: 'COUNTRY', iso3: iso3Param },
      select: { id: true, name: true, iso3: true }
    });
    if (!entity) {
      return res.status(404).json({ error: 'Country not found' });
    }
    const iso3 = entity.iso3 as string;

    const INDICATORS: Record<string, string> = {
      LIFE_EXPECTANCY: 'SP.DYN.LE00.IN',
      LITERACY_RATE_ADULT: 'SE.ADT.LITR.ZS',
      POVERTY_EXTREME_215: 'SI.POV.DDAY',
      UHC_SERVICE_COVERAGE_INDEX: 'SH.UHC.SRVS.CV.XD',
      PRIMARY_NET_ENROLLMENT: 'SE.PRM.NENR',
      POPULATION_TOTAL: 'SP.POP.TOTL',
      POPULATION_GROWTH: 'SP.POP.GROW',
      CRUDE_BIRTH_RATE: 'SP.DYN.CBRT.IN',
      CRUDE_DEATH_RATE: 'SP.DYN.CDRT.IN',
      URBAN_POPULATION_PERCENT: 'SP.URB.TOTL.IN.ZS',
      RURAL_POPULATION_PERCENT: 'SP.RUR.TOTL.ZS',
      POPULATION_DENSITY: 'SP.POP.DNST'
    };

    async function latest(code: keyof typeof INDICATORS): Promise<LatestPoint> {
      return await getLatestIndicatorValueForIso3(iso3, code);
    }

    const [
      lifeExpectancy,
      literacyRateAdult,
      povertyExtreme215,
      uhcServiceCoverageIndex,
      primaryNetEnrollment,
      populationTotal,
      populationGrowth,
      crudeBirthRate,
      crudeDeathRate,
      urbanPopulationPercent,
      ruralPopulationPercent,
      populationDensity
    ] = await Promise.all([
      latest('LIFE_EXPECTANCY'),
      latest('LITERACY_RATE_ADULT'),
      latest('POVERTY_EXTREME_215'),
      latest('UHC_SERVICE_COVERAGE_INDEX'),
      latest('PRIMARY_NET_ENROLLMENT'),
      latest('POPULATION_TOTAL'),
      latest('POPULATION_GROWTH'),
      latest('CRUDE_BIRTH_RATE'),
      latest('CRUDE_DEATH_RATE'),
      latest('URBAN_POPULATION_PERCENT'),
      latest('RURAL_POPULATION_PERCENT'),
      latest('POPULATION_DENSITY')
    ]);

    const response = {
      countryCode3: iso3,
      lifeExpectancy: { value: toNumberOrNull(lifeExpectancy.value), year: lifeExpectancy.year },
      literacyRateAdult: { value: toNumberOrNull(literacyRateAdult.value), year: literacyRateAdult.year },
      povertyExtreme215: { value: toNumberOrNull(povertyExtreme215.value), year: povertyExtreme215.year },
      uhcServiceCoverageIndex: { value: toNumberOrNull(uhcServiceCoverageIndex.value), year: uhcServiceCoverageIndex.year },
      primaryNetEnrollment: { value: toNumberOrNull(primaryNetEnrollment.value), year: primaryNetEnrollment.year },
      populationTotal: { value: toNumberOrNull(populationTotal.value), year: populationTotal.year },
      populationGrowth: { value: toNumberOrNull(populationGrowth.value), year: populationGrowth.year },
      crudeBirthRate: { value: toNumberOrNull(crudeBirthRate.value), year: crudeBirthRate.year },
      crudeDeathRate: { value: toNumberOrNull(crudeDeathRate.value), year: crudeDeathRate.year },
      urbanPopulationPercent: { value: toNumberOrNull(urbanPopulationPercent.value), year: urbanPopulationPercent.year },
      ruralPopulationPercent: { value: toNumberOrNull(ruralPopulationPercent.value), year: ruralPopulationPercent.year },
      populationDensity: { value: toNumberOrNull(populationDensity.value), year: populationDensity.year }
    };

    res.json(response);
  } catch (error) {
    console.error('getSocietyByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch society data from database' });
  }
};

/**
 * DB-backed time series endpoint (no external World Bank calls).
 * Returns [{ year, value }] from indicatorValue for the requested country/indicator.
 */
export const getWorldBankSeries: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    const indicatorCode = String(req.params.indicator || '').trim();
    const limitYears = req.query.limitYears ? parseInt(String(req.query.limitYears), 10) : undefined;

    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }

    if (!indicatorCode) {
      return res.status(400).json({ error: 'Indicator code is required' });
    }

    const entity = await prisma.entity.findFirst({
      where: { type: 'COUNTRY', iso3: iso3Param },
      select: { id: true }
    });

    if (!entity) {
      return res.json([]); // Keep frontend behavior: empty array when no data
    }

    const series = await prisma.indicatorValue.findMany({
      where: {
        entityId: entity.id,
        indicatorCode,
      },
      orderBy: { year: 'asc' },
      select: { year: true, value: true }
    });

    const normalized = series.map((row) => ({
      year: row.year,
      value: row.value !== null && row.value !== undefined ? Number(row.value.toString()) : null
    }));

    const result =
      limitYears && limitYears > 0 ? normalized.slice(-limitYears) : normalized;

    res.json(result);
  } catch (error) {
    console.error('getWorldBankSeries DB fallback error:', error);
    res.json([]); // Preserve non-throwing behavior to keep frontend stable
  }
};




