import { Router, RequestHandler } from 'express';
import { prisma } from '../db/client';

const router = Router();

const getSummary: RequestHandler = async (_req, res) => {
  try {
    const [totalConflicts, activeConflicts, countriesAffected] = await Promise.all([
      prisma.acledConflict.count(),
      prisma.acledConflict.count({ where: { status: { in: ['WAR', 'WARM'] } } }),
      prisma.acledConflict.findMany({
        select: { involvedISO: true },
      }),
    ]);

    // Count unique ISO codes across all conflicts
    const isoSet = new Set<string>();
    for (const c of countriesAffected) {
      for (const iso of c.involvedISO) {
        isoSet.add(iso);
      }
    }

    // avgSeverity: WAR=5, WARM=4, IMPROVING=2, FROZEN=3, RESOLVED=1
    const severityMap: Record<string, number> = {
      WAR: 5, WARM: 4, FROZEN: 3, IMPROVING: 2, RESOLVED: 1,
    };
    const allConflicts = await prisma.acledConflict.findMany({ select: { status: true } });
    const avgSeverity = allConflicts.length > 0
      ? +(allConflicts.reduce((sum, c) => sum + (severityMap[c.status] ?? 0), 0) / allConflicts.length).toFixed(2)
      : 0;

    res.json({
      data: {
        totalConflicts,
        activeConflicts,
        countriesAffected: isoSet.size,
        avgSeverity,
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      data: { totalConflicts: 0, activeConflicts: 0, countriesAffected: 0, avgSeverity: 0 },
    });
  }
};

router.get('/summary', getSummary);

export default router;
