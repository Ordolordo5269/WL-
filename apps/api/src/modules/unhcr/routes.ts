import { Router, Request, Response } from 'express';
import { prisma } from '../../db/client.js';
import { authenticate } from '../../middleware/auth.js';
import { syncUnhcr } from './sync.js';

const router = Router();

// POST /api/unhcr/sync
router.post('/sync', authenticate, async (req: Request, res: Response) => {
  try {
    const years: number[] = req.body?.years || [new Date().getFullYear() - 1];
    const result = await syncUnhcr(years);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/unhcr/sync/status
router.get('/sync/status', async (_req: Request, res: Response) => {
  try {
    const [count, last, years] = await Promise.all([
      prisma.migrationCorridor.count(),
      prisma.migrationCorridor.findFirst({ orderBy: { syncedAt: 'desc' }, select: { syncedAt: true } }),
      prisma.migrationCorridor.groupBy({ by: ['year'], _count: true, orderBy: { year: 'desc' } }),
    ]);

    res.json({
      corridors: count,
      lastSync: last?.syncedAt || null,
      yearBreakdown: years.map(y => ({ year: y.year, count: y._count })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
