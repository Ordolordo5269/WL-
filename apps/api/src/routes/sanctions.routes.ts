import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/sanctions/:iso3 — active sanctions for a country
router.get('/:iso3', async (req: Request, res: Response) => {
  try {
    const iso3 = req.params.iso3.toUpperCase();
    const sanctions = await prisma.sanction.findMany({
      where: { countryIso3: iso3, isActive: true },
      orderBy: { listedAt: 'desc' },
    });

    res.json({
      countryIso3: iso3,
      count: sanctions.length,
      sanctions: sanctions.map(s => ({
        id: s.id,
        entityName: s.entityName,
        entityType: s.entityType,
        sanctionProgram: s.sanctionProgram,
        sanctionAuthority: s.sanctionAuthority,
        reason: s.reason,
        listedAt: s.listedAt,
        delistedAt: s.delistedAt,
        isActive: s.isActive,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sanctions' });
  }
});

// GET /api/sanctions/summary/all — count per country
router.get('/summary/all', async (_req: Request, res: Response) => {
  try {
    const summary = await prisma.sanction.groupBy({
      by: ['countryIso3'],
      _count: true,
      where: { isActive: true },
      orderBy: { _count: { countryIso3: 'desc' } },
    });

    res.json({
      data: summary.map(s => ({
        countryIso3: s.countryIso3,
        count: s._count,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sanctions summary' });
  }
});

export default router;
