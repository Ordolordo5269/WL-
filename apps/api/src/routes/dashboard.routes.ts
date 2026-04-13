import { Router, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { logger } from '../config/logger.js';

const router = Router();

const getSummary: RequestHandler = async (_req, res) => {
  try {
    const [totalConflicts, activeConflicts, countriesAffected] = await Promise.all([
      prisma.conflict.count(),
      prisma.conflict.count({ where: { status: 'ACTIVE' } }),
      prisma.conflict.findMany({ select: { countryIso: true }, distinct: ['countryIso'] }),
    ]);

    const allConflicts = await prisma.conflict.findMany({ select: { status: true, casualtiesEstimate: true } });
    const totalDeaths = allConflicts.reduce((sum, c) => sum + (c.casualtiesEstimate ?? 0), 0);

    const severityMap: Record<string, number> = { ACTIVE: 5, FROZEN: 3, ENDED: 1 };
    const avgSeverity = allConflicts.length > 0
      ? +(allConflicts.reduce((sum, c) => sum + (severityMap[c.status] ?? 0), 0) / allConflicts.length).toFixed(2)
      : 0;

    res.json({
      data: {
        totalConflicts,
        activeConflicts,
        countriesAffected: countriesAffected.length,
        avgSeverity,
        totalDeaths,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Dashboard summary error');
    res.status(500).json({
      data: { totalConflicts: 0, activeConflicts: 0, countriesAffected: 0, avgSeverity: 0, totalDeaths: 0 },
    });
  }
};

router.get('/summary', getSummary);

/**
 * P3 A5: Global Indicators (FAO Food Price Index + sub-indices)
 *
 * Returns the latest available annual average for the global food price
 * indices, plus previous year for trend calculation. Data is stored on the
 * special WLD (World) entity.
 *
 * Base period: 2014-2016 = 100.
 */
const getGlobalIndicators: RequestHandler = async (_req, res) => {
  try {
    const world = await prisma.entity.findUnique({ where: { slug: 'world' }, select: { id: true } });
    if (!world) {
      res.json({ data: { foodPriceIndex: null } });
      return;
    }

    const FPI_CODES = [
      'FAO_FPI', 'FAO_MEAT_PRICE_IDX', 'FAO_DAIRY_PRICE_IDX',
      'FAO_CEREAL_PRICE_IDX', 'FAO_OILS_PRICE_IDX', 'FAO_SUGAR_PRICE_IDX',
    ];

    const latestRows = await prisma.indicatorValue.findMany({
      where: { entityId: world.id, indicatorCode: { in: FPI_CODES } },
      orderBy: { year: 'desc' },
    });

    // Group by indicator, keep latest + previous year per indicator
    const byCode: Record<string, { latest?: { year: number; value: number; meta: unknown }; previous?: { year: number; value: number } }> = {};
    for (const r of latestRows) {
      const existing = byCode[r.indicatorCode] || {};
      const v = r.value != null ? Number(r.value) : null;
      if (v === null) continue;
      if (!existing.latest) {
        existing.latest = { year: r.year, value: v, meta: r.meta };
      } else if (!existing.previous && r.year < existing.latest.year) {
        existing.previous = { year: r.year, value: v };
      }
      byCode[r.indicatorCode] = existing;
    }

    const buildEntry = (code: string) => {
      const b = byCode[code];
      if (!b?.latest) return null;
      const trendPct = b.previous ? ((b.latest.value - b.previous.value) / b.previous.value) * 100 : null;
      return {
        year: b.latest.year,
        annualAverage: b.latest.value,
        trendPct: trendPct !== null ? Number(trendPct.toFixed(2)) : null,
        latestMonth: b.latest.meta && typeof b.latest.meta === 'object' ? (b.latest.meta as any).latestMonth ?? null : null,
        latestValue: b.latest.meta && typeof b.latest.meta === 'object' ? (b.latest.meta as any).latestValue ?? null : null,
      };
    };

    res.json({
      data: {
        foodPriceIndex: {
          composite: buildEntry('FAO_FPI'),
          cereals: buildEntry('FAO_CEREAL_PRICE_IDX'),
          dairy: buildEntry('FAO_DAIRY_PRICE_IDX'),
          meat: buildEntry('FAO_MEAT_PRICE_IDX'),
          oils: buildEntry('FAO_OILS_PRICE_IDX'),
          sugar: buildEntry('FAO_SUGAR_PRICE_IDX'),
          baseNote: 'Index: 2014-2016 average = 100',
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Dashboard global indicators error');
    res.status(500).json({ data: { foodPriceIndex: null } });
  }
};

router.get('/global-indicators', getGlobalIndicators);

export default router;
