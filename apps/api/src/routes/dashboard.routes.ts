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

export default router;
