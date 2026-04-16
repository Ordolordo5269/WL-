import { Router, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { logger } from '../config/logger.js';

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

export default router;
