import { Router, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { logger } from '../config/logger.js';
import { HS2_CODES } from '../scripts/lib/hs2-codes';

const router = Router();

/**
 * P4 Fase A: Top trade partners for a country.
 *
 * GET /api/trade/:iso3/partners?year=2022&flow=export
 *
 * Reads from TradeFlow table (bilateral TOTAL aggregate).
 * Returns top 20 partners sorted by valueUsd descending.
 */
const getTradePartners: RequestHandler = async (req, res) => {
  try {
    const iso3 = (req.params.iso3 || '').toUpperCase();
    if (!iso3 || iso3.length !== 3) {
      res.status(400).json({ error: 'Invalid ISO3 code' });
      return;
    }

    const yearParam = parseInt(req.query.year as string) || 2022;
    const flow = (req.query.flow as string || 'export').toLowerCase();
    if (flow !== 'export' && flow !== 'import') {
      res.status(400).json({ error: 'flow must be "export" or "import"' });
      return;
    }

    const entity = await prisma.entity.findFirst({
      where: { iso3, type: 'COUNTRY' },
      select: { id: true, name: true, iso3: true },
    });
    if (!entity) {
      res.json({ data: { reporter: null, year: yearParam, flow, partners: [], totalValueUsd: 0 } });
      return;
    }

    interface PartnerRow {
      partnerId: string;
      partnerIso3: string;
      partnerName: string;
      valueUsd: number;
    }

    let partners: PartnerRow[];

    if (flow === 'export') {
      partners = await prisma.$queryRaw<PartnerRow[]>`
        SELECT tf."toId" AS "partnerId", e.iso3 AS "partnerIso3", e.name AS "partnerName",
               tf."valueUsd"::float AS "valueUsd"
        FROM "TradeFlow" tf
        JOIN "Entity" e ON e.id = tf."toId"
        WHERE tf."fromId" = ${entity.id}
          AND tf.year = ${yearParam}
          AND tf."hsCode" = 'TOTAL'
          AND tf."valueUsd" IS NOT NULL AND tf."valueUsd" > 0
        ORDER BY tf."valueUsd" DESC
        LIMIT 20
      `;
    } else {
      partners = await prisma.$queryRaw<PartnerRow[]>`
        SELECT tf."fromId" AS "partnerId", e.iso3 AS "partnerIso3", e.name AS "partnerName",
               tf."valueUsd"::float AS "valueUsd"
        FROM "TradeFlow" tf
        JOIN "Entity" e ON e.id = tf."fromId"
        WHERE tf."toId" = ${entity.id}
          AND tf.year = ${yearParam}
          AND tf."hsCode" = 'TOTAL'
          AND tf."valueUsd" IS NOT NULL AND tf."valueUsd" > 0
        ORDER BY tf."valueUsd" DESC
        LIMIT 20
      `;
    }

    // Total across ALL partners (not just top 20) for accurate percentages
    interface TotalRow { total: number }
    const totalRows = flow === 'export'
      ? await prisma.$queryRaw<TotalRow[]>`
          SELECT COALESCE(SUM("valueUsd"), 0)::float AS total
          FROM "TradeFlow"
          WHERE "fromId" = ${entity.id} AND year = ${yearParam}
            AND "hsCode" = 'TOTAL' AND "valueUsd" IS NOT NULL AND "valueUsd" > 0
        `
      : await prisma.$queryRaw<TotalRow[]>`
          SELECT COALESCE(SUM("valueUsd"), 0)::float AS total
          FROM "TradeFlow"
          WHERE "toId" = ${entity.id} AND year = ${yearParam}
            AND "hsCode" = 'TOTAL' AND "valueUsd" IS NOT NULL AND "valueUsd" > 0
        `;
    const totalValueUsd = totalRows[0]?.total ?? 0;

    res.json({
      data: {
        reporter: { iso3: entity.iso3, name: entity.name },
        year: yearParam,
        flow,
        partners: partners.map((p) => ({
          iso3: p.partnerIso3,
          name: p.partnerName,
          valueUsd: p.valueUsd,
          percentOfTotal: totalValueUsd > 0 ? Number(((p.valueUsd / totalValueUsd) * 100).toFixed(2)) : 0,
        })),
        totalValueUsd,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Trade partners error');
    res.status(500).json({ error: 'Failed to fetch trade partners' });
  }
};

router.get('/:iso3/partners', getTradePartners);

/**
 * P4 Fase B: Top commodities (HS2) for a country.
 *
 * GET /api/trade/:iso3/commodities?year=2024&flow=export&limit=15
 *
 * Aggregates TradeFlow by hsCode across all partners. Returns top N
 * commodities with value, percentOfTotal, and top 3 partners each.
 */
const getTradeCommodities: RequestHandler = async (req, res) => {
  try {
    const iso3 = (req.params.iso3 || '').toUpperCase();
    if (!iso3 || iso3.length !== 3) {
      res.status(400).json({ error: 'Invalid ISO3 code' });
      return;
    }

    const yearParam = parseInt(req.query.year as string) || 2024;
    const flow = (req.query.flow as string || 'export').toLowerCase();
    const limit = Math.min(parseInt(req.query.limit as string) || 15, 50);
    if (flow !== 'export' && flow !== 'import') {
      res.status(400).json({ error: 'flow must be "export" or "import"' });
      return;
    }

    const entity = await prisma.entity.findFirst({
      where: { iso3, type: 'COUNTRY' },
      select: { id: true, name: true, iso3: true },
    });
    if (!entity) {
      res.json({ data: { reporter: null, year: yearParam, flow, commodities: [], totalValueUsd: 0 } });
      return;
    }

    // Get TOTAL value for percentage calculation
    interface TotalRow { total: number }
    const dirField = flow === 'export' ? 'fromId' : 'toId';
    const totalRows = await prisma.$queryRawUnsafe<TotalRow[]>(`
      SELECT COALESCE(SUM("valueUsd"), 0)::float AS total
      FROM "TradeFlow"
      WHERE "${dirField}" = '${entity.id}' AND year = ${yearParam}
        AND "hsCode" = 'TOTAL' AND "valueUsd" IS NOT NULL AND "valueUsd" > 0
    `);
    const totalValueUsd = totalRows[0]?.total ?? 0;

    // Top commodities aggregated across all partners
    interface CommodityRow { hsCode: string; valueUsd: number }
    const commodities = await prisma.$queryRawUnsafe<CommodityRow[]>(`
      SELECT "hsCode", SUM("valueUsd")::float AS "valueUsd"
      FROM "TradeFlow"
      WHERE "${dirField}" = '${entity.id}'
        AND year = ${yearParam}
        AND "hsCode" != 'TOTAL'
        AND "valueUsd" IS NOT NULL AND "valueUsd" > 0
      GROUP BY "hsCode"
      ORDER BY "valueUsd" DESC
      LIMIT ${limit}
    `);

    if (commodities.length === 0) {
      res.json({ data: { reporter: { iso3: entity.iso3, name: entity.name }, year: yearParam, flow, commodities: [], totalValueUsd } });
      return;
    }

    // Top 3 partners per commodity in one query using ROW_NUMBER
    const hsCodes = commodities.map((c) => `'${c.hsCode}'`).join(',');
    const partnerJoinCol = flow === 'export' ? 'toId' : 'fromId';
    interface PartnerRankedRow { hsCode: string; partnerIso3: string; partnerName: string; valueUsd: number; rn: number }
    const partnersRanked = await prisma.$queryRawUnsafe<PartnerRankedRow[]>(`
      SELECT sub.* FROM (
        SELECT tf."hsCode",
               e.iso3 AS "partnerIso3", e.name AS "partnerName",
               tf."valueUsd"::float AS "valueUsd",
               ROW_NUMBER() OVER (PARTITION BY tf."hsCode" ORDER BY tf."valueUsd" DESC) AS rn
        FROM "TradeFlow" tf
        JOIN "Entity" e ON e.id = tf."${partnerJoinCol}"
        WHERE tf."${dirField}" = '${entity.id}'
          AND tf.year = ${yearParam}
          AND tf."hsCode" IN (${hsCodes})
          AND tf."valueUsd" IS NOT NULL AND tf."valueUsd" > 0
      ) sub
      WHERE sub.rn <= 3
    `);

    // Group partners by hsCode
    const partnersByHs = new Map<string, Array<{ iso3: string; name: string; valueUsd: number }>>();
    for (const p of partnersRanked) {
      const arr = partnersByHs.get(p.hsCode) || [];
      arr.push({ iso3: p.partnerIso3, name: p.partnerName, valueUsd: p.valueUsd });
      partnersByHs.set(p.hsCode, arr);
    }

    res.json({
      data: {
        reporter: { iso3: entity.iso3, name: entity.name },
        year: yearParam,
        flow,
        commodities: commodities.map((c) => ({
          hsCode: c.hsCode,
          hsName: HS2_CODES[c.hsCode] || `HS ${c.hsCode}`,
          valueUsd: c.valueUsd,
          percentOfTotal: totalValueUsd > 0 ? Number(((c.valueUsd / totalValueUsd) * 100).toFixed(2)) : 0,
          topPartners: partnersByHs.get(c.hsCode) || [],
        })),
        totalValueUsd,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Trade commodities error');
    res.status(500).json({ error: 'Failed to fetch trade commodities' });
  }
};

/**
 * P4 Fase B: Partners for a specific commodity (drill-down).
 *
 * GET /api/trade/:iso3/commodities/:hsCode/partners?year=2024&flow=export
 */
const getCommodityPartners: RequestHandler = async (req, res) => {
  try {
    const iso3 = (req.params.iso3 || '').toUpperCase();
    const hsCode = (req.params.hsCode || '').padStart(2, '0');
    if (!iso3 || iso3.length !== 3) {
      res.status(400).json({ error: 'Invalid ISO3 code' });
      return;
    }

    const yearParam = parseInt(req.query.year as string) || 2024;
    const flow = (req.query.flow as string || 'export').toLowerCase();
    if (flow !== 'export' && flow !== 'import') {
      res.status(400).json({ error: 'flow must be "export" or "import"' });
      return;
    }

    const entity = await prisma.entity.findFirst({
      where: { iso3, type: 'COUNTRY' },
      select: { id: true, name: true, iso3: true },
    });
    if (!entity) {
      res.json({ data: { reporter: null, hsCode, hsName: HS2_CODES[hsCode] || hsCode, year: yearParam, flow, partners: [], totalValueUsd: 0 } });
      return;
    }

    const dirField = flow === 'export' ? 'fromId' : 'toId';
    const partnerJoinCol = flow === 'export' ? 'toId' : 'fromId';

    interface PartnerRow { partnerIso3: string; partnerName: string; valueUsd: number }
    const partners = await prisma.$queryRawUnsafe<PartnerRow[]>(`
      SELECT e.iso3 AS "partnerIso3", e.name AS "partnerName",
             tf."valueUsd"::float AS "valueUsd"
      FROM "TradeFlow" tf
      JOIN "Entity" e ON e.id = tf."${partnerJoinCol}"
      WHERE tf."${dirField}" = '${entity.id}'
        AND tf.year = ${yearParam}
        AND tf."hsCode" = '${hsCode}'
        AND tf."valueUsd" IS NOT NULL AND tf."valueUsd" > 0
      ORDER BY tf."valueUsd" DESC
      LIMIT 20
    `);

    // Total for this commodity across all partners
    interface TotalRow { total: number }
    const totalRows = await prisma.$queryRawUnsafe<TotalRow[]>(`
      SELECT COALESCE(SUM("valueUsd"), 0)::float AS total
      FROM "TradeFlow"
      WHERE "${dirField}" = '${entity.id}' AND year = ${yearParam}
        AND "hsCode" = '${hsCode}' AND "valueUsd" IS NOT NULL AND "valueUsd" > 0
    `);
    const totalValueUsd = totalRows[0]?.total ?? 0;

    res.json({
      data: {
        reporter: { iso3: entity.iso3, name: entity.name },
        hsCode,
        hsName: HS2_CODES[hsCode] || `HS ${hsCode}`,
        year: yearParam,
        flow,
        partners: partners.map((p) => ({
          iso3: p.partnerIso3,
          name: p.partnerName,
          valueUsd: p.valueUsd,
          percentOfTotal: totalValueUsd > 0 ? Number(((p.valueUsd / totalValueUsd) * 100).toFixed(2)) : 0,
        })),
        totalValueUsd,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Commodity partners error');
    res.status(500).json({ error: 'Failed to fetch commodity partners' });
  }
};

router.get('/:iso3/commodities/:hsCode/partners', getCommodityPartners);
router.get('/:iso3/commodities', getTradeCommodities);

export default router;
