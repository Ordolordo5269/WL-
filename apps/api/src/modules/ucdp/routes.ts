import { Router, type Request, type Response } from 'express';
import { prisma } from '../../db/client.js';
import { syncUcdpData, getSyncStatus } from './sync.js';
import { logger } from '../../config/logger.js';
const router = Router();

/**
 * GET /api/ucdp/geo
 * Lightweight: all event coordinates for map visualization (~25k points)
 * Returns only: lat, lng, bestEstimate, typeOfViolence, conflictName
 */
router.get('/geo', async (_req: Request, res: Response) => {
  try {
    const events = await prisma.ucdpGedEvent.findMany({
      select: {
        latitude: true,
        longitude: true,
        bestEstimate: true,
        typeOfViolence: true,
        conflictName: true,
        whereDescription: true,
      },
    });
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=300');
    res.json(events);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch geo events');
    res.status(500).json({ error: 'Failed to fetch geo events' });
  }
});

/**
 * GET /api/ucdp/sync/status
 * Returns the current sync status
 */
router.get('/sync/status', async (_req: Request, res: Response) => {
  try {
    const status = await getSyncStatus();
    res.json(status);
  } catch (err) {
    logger.error({ err }, 'Failed to get sync status');
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

/**
 * POST /api/ucdp/sync
 * Trigger a manual UCDP sync
 */
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    const result = await syncUcdpData();
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Manual UCDP sync failed');
    res.status(500).json({ error: 'Sync failed' });
  }
});

/**
 * GET /api/ucdp/events
 * Fetch raw UCDP GED events with filters
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const {
      conflictId,
      country,
      dateFrom,
      dateTo,
      typeOfViolence,
      page = '0',
      pageSize = '50',
    } = req.query as Record<string, string>;

    const skip = parseInt(page) * parseInt(pageSize);
    const take = Math.min(parseInt(pageSize) || 50, 200);

    const where: any = {};
    if (conflictId) where.conflictId = conflictId;
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (typeOfViolence) where.typeOfViolence = parseInt(typeOfViolence);
    if (dateFrom || dateTo) {
      where.dateStart = {};
      if (dateFrom) where.dateStart.gte = new Date(dateFrom);
      if (dateTo) where.dateStart.lte = new Date(dateTo);
    }

    const [events, total] = await Promise.all([
      prisma.ucdpGedEvent.findMany({
        where,
        orderBy: { dateStart: 'desc' },
        skip,
        take,
      }),
      prisma.ucdpGedEvent.count({ where }),
    ]);

    res.json({
      data: events,
      total,
      page: parseInt(page),
      pageSize: take,
      totalPages: Math.ceil(total / take),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch UCDP events');
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * GET /api/ucdp/events/conflict/:conflictId
 * Fetch UCDP events for a specific conflict
 */
router.get('/events/conflict/:conflictId', async (req: Request, res: Response) => {
  try {
    const { conflictId } = req.params;
    const { page = '0', pageSize = '50' } = req.query as Record<string, string>;

    const skip = parseInt(page) * parseInt(pageSize);
    const take = Math.min(parseInt(pageSize) || 50, 200);

    const [events, total] = await Promise.all([
      prisma.ucdpGedEvent.findMany({
        where: { conflictId },
        orderBy: { dateStart: 'desc' },
        skip,
        take,
      }),
      prisma.ucdpGedEvent.count({ where: { conflictId } }),
    ]);

    // Aggregate stats for this conflict
    const stats = await prisma.ucdpGedEvent.aggregate({
      where: { conflictId },
      _sum: {
        bestEstimate: true,
        deathsA: true,
        deathsB: true,
        deathsCivilians: true,
        deathsUnknown: true,
      },
      _count: true,
    });

    res.json({
      data: events,
      total,
      page: parseInt(page),
      pageSize: take,
      totalPages: Math.ceil(total / take),
      stats: {
        totalEvents: stats._count,
        totalDeaths: stats._sum.bestEstimate || 0,
        deathsSideA: stats._sum.deathsA || 0,
        deathsSideB: stats._sum.deathsB || 0,
        deathsCivilians: stats._sum.deathsCivilians || 0,
        deathsUnknown: stats._sum.deathsUnknown || 0,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch conflict UCDP events');
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
