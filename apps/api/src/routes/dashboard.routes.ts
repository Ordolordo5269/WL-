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

/**
 * P3 Fase B: Global Commodity Prices (World Bank Pink Sheet)
 *
 * 15 core commodities (energy, metals, precious, agri) stored as annual
 * averages on the WLD entity. Each row's meta carries the latestMonth +
 * latestValue so the UI can show both annual trends and a recent tick.
 */
interface CommodityDef {
  code: string;
  name: string;
  unit: string;
  category: 'Energy' | 'Metals' | 'Precious' | 'Agriculture';
}

const COMMODITY_DEFS: CommodityDef[] = [
  { code: 'BRENT_USD_BBL',       name: 'Brent Crude',       unit: 'USD/bbl',   category: 'Energy' },
  { code: 'WTI_USD_BBL',         name: 'WTI Crude',         unit: 'USD/bbl',   category: 'Energy' },
  { code: 'HENRY_HUB_USD_MMBTU', name: 'Natural Gas (US)',  unit: 'USD/mmbtu', category: 'Energy' },
  { code: 'TTF_USD_MMBTU',       name: 'Natural Gas (EU)',  unit: 'USD/mmbtu', category: 'Energy' },
  { code: 'COAL_AU_USD_MT',      name: 'Coal (Australian)', unit: 'USD/mt',    category: 'Energy' },
  { code: 'COPPER_USD_MT',       name: 'Copper',            unit: 'USD/mt',    category: 'Metals' },
  { code: 'NICKEL_USD_MT',       name: 'Nickel',            unit: 'USD/mt',    category: 'Metals' },
  { code: 'ALUMINUM_USD_MT',     name: 'Aluminum',          unit: 'USD/mt',    category: 'Metals' },
  { code: 'ZINC_USD_MT',         name: 'Zinc',              unit: 'USD/mt',    category: 'Metals' },
  { code: 'GOLD_USD_OZT',        name: 'Gold',              unit: 'USD/oz',    category: 'Precious' },
  { code: 'SILVER_USD_OZT',      name: 'Silver',            unit: 'USD/oz',    category: 'Precious' },
  { code: 'WHEAT_USD_MT',        name: 'Wheat',             unit: 'USD/mt',    category: 'Agriculture' },
  { code: 'MAIZE_USD_MT',        name: 'Maize',             unit: 'USD/mt',    category: 'Agriculture' },
  { code: 'SOYBEAN_USD_MT',      name: 'Soybeans',          unit: 'USD/mt',    category: 'Agriculture' },
  { code: 'PALM_OIL_USD_MT',     name: 'Palm Oil',          unit: 'USD/mt',    category: 'Agriculture' },
];

const getCommodityPrices: RequestHandler = async (_req, res) => {
  try {
    const world = await prisma.entity.findUnique({ where: { slug: 'world' }, select: { id: true } });
    if (!world) {
      res.json({ data: { commodities: [], lastUpdated: null, source: 'World Bank Pink Sheet' } });
      return;
    }

    const codes = COMMODITY_DEFS.map((c) => c.code);
    const rows = await prisma.indicatorValue.findMany({
      where: { entityId: world.id, indicatorCode: { in: codes } },
      orderBy: { year: 'desc' },
    });

    const byCode: Record<string, { latest?: { year: number; value: number; meta: unknown }; previous?: { year: number; value: number } }> = {};
    for (const r of rows) {
      const v = r.value != null ? Number(r.value) : null;
      if (v === null) continue;
      const existing = byCode[r.indicatorCode] || {};
      if (!existing.latest) {
        existing.latest = { year: r.year, value: v, meta: r.meta };
      } else if (!existing.previous && r.year < existing.latest.year) {
        existing.previous = { year: r.year, value: v };
      }
      byCode[r.indicatorCode] = existing;
    }

    let lastUpdatedYear = 0;
    let lastUpdatedMonth = 0;

    const commodities = COMMODITY_DEFS.map((def) => {
      const b = byCode[def.code];
      if (!b?.latest) return null;
      const meta = b.latest.meta as { latestMonth?: number; latestValue?: number } | null;
      const latestMonth = meta?.latestMonth ?? null;
      const latestValue = meta?.latestValue ?? b.latest.value;
      const annualAverage = b.latest.value;
      const annualAveragePrev = b.previous?.value ?? null;
      const trendPctYoY =
        annualAveragePrev !== null && annualAveragePrev > 0
          ? Number((((annualAverage - annualAveragePrev) / annualAveragePrev) * 100).toFixed(2))
          : null;

      if (latestMonth !== null) {
        const key = b.latest.year * 100 + latestMonth;
        if (key > lastUpdatedYear * 100 + lastUpdatedMonth) {
          lastUpdatedYear = b.latest.year;
          lastUpdatedMonth = latestMonth;
        }
      }

      return {
        code: def.code,
        name: def.name,
        unit: def.unit,
        category: def.category,
        year: b.latest.year,
        latestMonth,
        latestValue: Number(Number(latestValue).toFixed(2)),
        annualAverage: Number(annualAverage.toFixed(2)),
        annualAveragePrev: annualAveragePrev !== null ? Number(annualAveragePrev.toFixed(2)) : null,
        trendPctYoY,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    const lastUpdated =
      lastUpdatedYear > 0
        ? `${lastUpdatedYear}-${String(lastUpdatedMonth).padStart(2, '0')}`
        : null;

    res.json({
      data: {
        commodities,
        lastUpdated,
        source: 'World Bank Pink Sheet',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Dashboard commodity prices error');
    res.status(500).json({ data: { commodities: [], lastUpdated: null, source: 'World Bank Pink Sheet' } });
  }
};

router.get('/commodity-prices', getCommodityPrices);

export default router;
