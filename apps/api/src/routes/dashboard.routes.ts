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

/**
 * P1 Fase A: Financial Pulse
 *
 * Returns FX + Rates + Equity + Crypto latest tick + YoY trend,
 * plus live Polymarket snapshot for curated geopolitical markets.
 */
type FinCategory = 'FX' | 'Rates' | 'Vol' | 'Equity' | 'Crypto';
interface FinDef { code: string; name: string; unit: string; category: FinCategory }

const FINANCIAL_DEFS: FinDef[] = [
  // FX
  { code: 'DXY_BROAD',    name: 'US Dollar Index',    unit: 'index',   category: 'FX' },
  { code: 'FX_USD_EUR',   name: 'USD / EUR',          unit: 'USD/EUR', category: 'FX' },
  { code: 'FX_JPY_USD',   name: 'JPY / USD',          unit: 'JPY/USD', category: 'FX' },
  { code: 'FX_CNY_USD',   name: 'CNY / USD',          unit: 'CNY/USD', category: 'FX' },
  { code: 'FX_BRL_USD',   name: 'BRL / USD',          unit: 'BRL/USD', category: 'FX' },
  { code: 'FX_MXN_USD',   name: 'MXN / USD',          unit: 'MXN/USD', category: 'FX' },
  { code: 'FX_INR_USD',   name: 'INR / USD',          unit: 'INR/USD', category: 'FX' },
  { code: 'FX_THB_USD',   name: 'THB / USD',          unit: 'THB/USD', category: 'FX' },
  // Rates
  { code: 'RATE_10Y_UST',   name: '10Y US Treasury',  unit: '%', category: 'Rates' },
  { code: 'RATE_10Y_BUND',  name: '10Y Bund',         unit: '%', category: 'Rates' },
  { code: 'RATE_10Y_JGB',   name: '10Y JGB',          unit: '%', category: 'Rates' },
  { code: 'RATE_FED_FUNDS', name: 'Fed Funds',        unit: '%', category: 'Rates' },
  { code: 'RATE_SOFR',      name: 'SOFR',             unit: '%', category: 'Rates' },
  // Vol / stress
  { code: 'VIX',            name: 'VIX',              unit: 'index', category: 'Vol' },
  { code: 'HY_OAS_SPREAD',  name: 'HY Spread',        unit: '%',     category: 'Vol' },
  // Equity
  { code: 'EQ_SP500',   name: 'S&P 500',              unit: 'pts', category: 'Equity' },
  { code: 'EQ_NASDAQ',  name: 'NASDAQ',               unit: 'pts', category: 'Equity' },
  { code: 'EQ_DJIA',    name: 'Dow Jones',            unit: 'pts', category: 'Equity' },
  { code: 'EQ_NIKKEI',  name: 'Nikkei 225',           unit: 'pts', category: 'Equity' },
  // Crypto
  { code: 'CRYPTO_BTC', name: 'Bitcoin',              unit: 'USD', category: 'Crypto' },
  { code: 'CRYPTO_ETH', name: 'Ethereum',             unit: 'USD', category: 'Crypto' },
  { code: 'CRYPTO_BNB', name: 'BNB',                  unit: 'USD', category: 'Crypto' },
  { code: 'CRYPTO_SOL', name: 'Solana',               unit: 'USD', category: 'Crypto' },
  { code: 'CRYPTO_XRP', name: 'XRP',                  unit: 'USD', category: 'Crypto' },
];

const getFinancialPulse: RequestHandler = async (_req, res) => {
  try {
    const world = await prisma.entity.findUnique({ where: { slug: 'world' }, select: { id: true } });
    if (!world) {
      res.json({ data: { fx: [], rates: [], equities: [], crypto: [], vol: [], prediction: [], lastUpdated: null } });
      return;
    }

    const codes = FINANCIAL_DEFS.map((d) => d.code);
    const rows = await prisma.indicatorValue.findMany({
      where: { entityId: world.id, indicatorCode: { in: codes } },
      orderBy: { year: 'desc' },
    });

    const byCode: Record<string, { latest?: { year: number; value: number; meta: unknown }; previous?: { year: number; value: number } }> = {};
    for (const r of rows) {
      const v = r.value != null ? Number(r.value) : null;
      if (v === null) continue;
      const existing = byCode[r.indicatorCode] || {};
      if (!existing.latest) existing.latest = { year: r.year, value: v, meta: r.meta };
      else if (!existing.previous && r.year < existing.latest.year) existing.previous = { year: r.year, value: v };
      byCode[r.indicatorCode] = existing;
    }

    let lastY = 0, lastM = 0;

    const buildEntry = (def: FinDef) => {
      const b = byCode[def.code];
      if (!b?.latest) return null;
      const meta = b.latest.meta as { latestMonth?: number; latestValue?: number } | null;
      const latestMonth = meta?.latestMonth ?? null;
      const latestValue = meta?.latestValue ?? b.latest.value;
      const annualAverage = b.latest.value;
      const annualAveragePrev = b.previous?.value ?? null;
      const trendPctYoY =
        annualAveragePrev !== null && annualAveragePrev !== 0
          ? Number((((annualAverage - annualAveragePrev) / Math.abs(annualAveragePrev)) * 100).toFixed(2))
          : null;

      if (latestMonth !== null) {
        const key = b.latest.year * 100 + latestMonth;
        if (key > lastY * 100 + lastM) { lastY = b.latest.year; lastM = latestMonth; }
      }

      return {
        code: def.code,
        name: def.name,
        unit: def.unit,
        category: def.category,
        year: b.latest.year,
        latestMonth,
        latestValue: Number(Number(latestValue).toFixed(4)),
        annualAverage: Number(annualAverage.toFixed(4)),
        annualAveragePrev: annualAveragePrev !== null ? Number(annualAveragePrev.toFixed(4)) : null,
        trendPctYoY,
      };
    };

    const fx: NonNullable<ReturnType<typeof buildEntry>>[] = [];
    const rates: typeof fx = [];
    const vol: typeof fx = [];
    const equities: typeof fx = [];
    const crypto: typeof fx = [];

    for (const def of FINANCIAL_DEFS) {
      const e = buildEntry(def);
      if (!e) continue;
      if (def.category === 'FX') fx.push(e);
      else if (def.category === 'Rates') rates.push(e);
      else if (def.category === 'Vol') vol.push(e);
      else if (def.category === 'Equity') equities.push(e);
      else if (def.category === 'Crypto') crypto.push(e);
    }

    // Prediction markets — read from dedicated PredictionMarketSnapshot table
    // (not IndicatorValue). Filter unresolved + not-yet-closed. Sorted by volume.
    interface PredictionRow {
      marketSlug: string;
      source: string;
      question: string;
      category: string | null;
      yesPrice: number | null;
      noPrice: number | null;
      volume: number | null;
      liquidity: number | null;
      closeDate: Date | null;
      sourceUrl: string | null;
    }
    const polyRows = await prisma.$queryRaw<PredictionRow[]>`
      SELECT "marketSlug", "source", "question", "category",
             "yesPrice"::float AS "yesPrice",
             "noPrice"::float AS "noPrice",
             "volume"::float AS "volume",
             "liquidity"::float AS "liquidity",
             "closeDate", "sourceUrl"
      FROM "PredictionMarketSnapshot"
      WHERE "resolved" = FALSE
        AND ("closeDate" IS NULL OR "closeDate" >= NOW())
      ORDER BY COALESCE("volume", 0) DESC
    `;

    const prediction = polyRows.map((r) => ({
      code: r.marketSlug,
      slug: r.marketSlug,
      category: r.category ?? 'Geopol',
      question: r.question,
      probabilityYes: r.yesPrice,
      probabilityNo: r.noPrice,
      volume: r.volume,
      liquidity: r.liquidity,
      closeDate: r.closeDate ? r.closeDate.toISOString().slice(0, 10) : null,
      sourceUrl: r.sourceUrl,
    }));

    const lastUpdated = lastY > 0 ? `${lastY}-${String(lastM).padStart(2, '0')}` : null;

    res.json({
      data: {
        fx, rates, vol, equities, crypto, prediction, lastUpdated,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Dashboard financial pulse error');
    res.status(500).json({ data: { fx: [], rates: [], vol: [], equities: [], crypto: [], prediction: [], lastUpdated: null } });
  }
};

router.get('/financial-pulse', getFinancialPulse);

export default router;
