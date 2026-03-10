import { Request, Response, RequestHandler } from 'express';
import * as service from './service.js';
import type { ConflictListFilters, EventFilters, TimelineParams } from './types.js';

// ── Conflict list ──

export const list: RequestHandler = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as ConflictListFilters;
    const result = await service.listConflicts(filters);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ data: result.data, count: result.total, pagination: { page: result.page, limit: result.limit, total: result.total } });
  } catch (error) {
    console.error('list conflicts error:', error);
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
};

// ── Conflict detail by slug ──

export const getBySlug: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const conflict = await service.getConflictBySlug(slug);

    if (!conflict) {
      res.status(404).json({ error: 'Conflict not found' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ data: conflict });
  } catch (error) {
    console.error('getBySlug error:', error);
    res.status(500).json({ error: 'Failed to fetch conflict' });
  }
};

// ── Events for a conflict ──

export const getEvents: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const filters = req.query as unknown as EventFilters;
    const result = await service.getConflictEvents(slug, filters);

    if (!result) {
      res.status(404).json({ error: 'Conflict not found' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ data: result.data, count: result.total, pagination: { page: result.page, limit: result.limit, total: result.total } });
  } catch (error) {
    console.error('getEvents error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// ── Heatmap data ──

export const getHeatmap: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const data = await service.getConflictHeatmap(slug);

    if (!data) {
      res.status(404).json({ error: 'Conflict not found' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
    res.json({ data });
  } catch (error) {
    console.error('getHeatmap error:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
};

// ── Timeline ──

export const getTimeline: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const params = req.query as unknown as TimelineParams;
    const data = await service.getConflictTimeline(slug, params);

    if (!data) {
      res.status(404).json({ error: 'Conflict not found' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
    res.json({ data });
  } catch (error) {
    console.error('getTimeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
};

// ── Global stats ──

export const getStats: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const stats = await service.getGlobalStats();
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
    res.json({ data: stats });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// ── Search ──

export const search: RequestHandler = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q || '').toString();
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!query) {
      res.status(400).json({ error: 'Search query (q) is required' });
      return;
    }

    const results = await service.searchConflicts(query, limit);
    res.json({ data: results, count: results.length });
  } catch (error) {
    console.error('search error:', error);
    res.status(500).json({ error: 'Failed to search conflicts' });
  }
};

// ── ACLED Sync ──

export const syncAll: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const results = await service.syncAllConflicts();
    res.json({ data: results });
  } catch (error) {
    console.error('syncAll error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
};

export const syncOne: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const conflict = await service.getConflictBySlug(slug);

    if (!conflict) {
      res.status(404).json({ error: 'Conflict not found' });
      return;
    }

    const count = await service.syncConflict(conflict.id);
    res.json({ data: { slug, eventsUpserted: count } });
  } catch (error) {
    console.error('syncOne error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
};
