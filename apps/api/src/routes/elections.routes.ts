import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/elections/:iso3 — elections for a country
router.get('/:iso3', async (req: Request, res: Response) => {
  try {
    const iso3 = req.params.iso3.toUpperCase();
    const elections = await prisma.electionCalendar.findMany({
      where: { countryIso3: iso3 },
      orderBy: { year: 'desc' },
    });

    const upcoming = elections.filter(e => e.status === 'scheduled');
    const recent = elections.filter(e => e.status === 'completed').slice(0, 5);

    res.json({
      countryIso3: iso3,
      upcoming,
      recent,
      total: elections.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
});

// GET /api/elections/upcoming/all — all upcoming elections globally
router.get('/upcoming/all', async (_req: Request, res: Response) => {
  try {
    const upcoming = await prisma.electionCalendar.findMany({
      where: { status: 'scheduled' },
      orderBy: { electionDate: 'asc' },
    });

    res.json({ data: upcoming, count: upcoming.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch upcoming elections' });
  }
});

export default router;
