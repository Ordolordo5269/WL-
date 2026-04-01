import { Router, RequestHandler } from 'express';
import { prisma } from '../db/client';
import { logger } from '../config/logger.js';

const router = Router();

const getSummary: RequestHandler = async (_req, res) => {
  try {
    const [totalConflicts, activeConflicts, countriesAffected, totalDeathsResult, ucdpEventCount] = await Promise.all([
      prisma.conflict.count(),
      prisma.conflict.count({ where: { status: { in: ['WAR', 'WARM'] } } }),
      prisma.conflict.findMany({
        select: { involvedISO: true },
      }),
      prisma.conflictCasualty.aggregate({
        where: { source: 'UCDP' },
        _sum: { total: true },
      }),
      prisma.ucdpGedEvent.count(),
    ]);

    // Count unique ISO codes across all conflicts
    const isoSet = new Set<string>();
    for (const c of countriesAffected) {
      for (const iso of c.involvedISO) {
        isoSet.add(iso);
      }
    }

    // avgSeverity: WAR=5, WARM=4, IMPROVING=2, FROZEN=3, RESOLVED=1, ONE_SIDED=4
    const severityMap: Record<string, number> = {
      WAR: 5, WARM: 4, ONE_SIDED: 4, FROZEN: 3, IMPROVING: 2, RESOLVED: 1,
    };
    const allConflicts = await prisma.conflict.findMany({ select: { status: true } });
    const avgSeverity = allConflicts.length > 0
      ? +(allConflicts.reduce((sum, c) => sum + (severityMap[c.status] ?? 0), 0) / allConflicts.length).toFixed(2)
      : 0;

    res.json({
      data: {
        totalConflicts,
        activeConflicts,
        countriesAffected: isoSet.size,
        avgSeverity,
        totalDeaths: totalDeathsResult._sum.total ?? 0,
        totalUcdpEvents: ucdpEventCount,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Dashboard summary error');
    res.status(500).json({
      data: { totalConflicts: 0, activeConflicts: 0, countriesAffected: 0, avgSeverity: 0, totalDeaths: 0, totalUcdpEvents: 0 },
    });
  }
};

router.get('/summary', getSummary);

export default router;
