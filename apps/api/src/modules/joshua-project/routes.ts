import { Router, Request, Response } from 'express';
import { prisma } from '../../db/client.js';
import { authenticate } from '../../middleware/auth.js';
import { syncJoshuaProject } from './sync.js';

const router = Router();

// POST /api/joshua-project/sync
router.post('/sync', authenticate, async (_req: Request, res: Response) => {
  try {
    const result = await syncJoshuaProject();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/joshua-project/sync/status
router.get('/sync/status', async (_req: Request, res: Response) => {
  try {
    const [langCount, religionCount, lastLang, lastReligion] = await Promise.all([
      prisma.language.count(),
      prisma.religionStat.count(),
      prisma.language.findFirst({ orderBy: { syncedAt: 'desc' }, select: { syncedAt: true } }),
      prisma.religionStat.findFirst({ orderBy: { syncedAt: 'desc' }, select: { syncedAt: true } }),
    ]);

    res.json({
      languages: langCount,
      religionStats: religionCount,
      lastSync: lastLang?.syncedAt || lastReligion?.syncedAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
