import { Request, Response, RequestHandler } from 'express';
import * as service from './service.js';
import type { ConflictFilters, LegacyConflictFilters } from './types.js';
import { ConflictStatus } from '@prisma/client';
import { broadcastConflictUpdate } from '../../websocket/broadcast';
import { prisma } from '../../db/client';

// ── V2 endpoints (list + detail with OSINT) ──

export const list: RequestHandler = async (req: Request, res: Response) => {
  const filters = req.query as unknown as ConflictFilters;
  const conflicts = await service.listConflicts(filters);
  res.json({ data: conflicts, count: conflicts.length });
};

export const getBySlug: RequestHandler = async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };
  const conflict = await service.getConflictBySlug(slug);

  if (!conflict) {
    res.status(404).json({ error: 'Conflict not found' });
    return;
  }

  res.json({ data: conflict });
};

// ── Legacy CRUD endpoints ──

export const getAllConflicts: RequestHandler = async (req: Request, res: Response) => {
  try {
    const filters: LegacyConflictFilters = {};

    if (req.query.region) filters.region = req.query.region as string;
    if (req.query.status) filters.status = req.query.status as ConflictStatus;
    if (req.query.country) filters.country = req.query.country as string;
    if (req.query.conflictType) filters.conflictType = req.query.conflictType as string;
    if (req.query.search) filters.search = req.query.search as string;

    if (req.query.startDateFrom) filters.startDateFrom = req.query.startDateFrom as string;
    if (req.query.startDateTo) filters.startDateTo = req.query.startDateTo as string;
    if (req.query.escalationDateFrom) filters.escalationDateFrom = req.query.escalationDateFrom as string;
    if (req.query.escalationDateTo) filters.escalationDateTo = req.query.escalationDateTo as string;
    if (req.query.activeOnly === 'true') filters.activeOnly = true;

    if (req.query.casualtiesMin) filters.casualtiesMin = parseInt(req.query.casualtiesMin as string, 10);
    if (req.query.casualtiesMax) filters.casualtiesMax = parseInt(req.query.casualtiesMax as string, 10);

    if (req.query.sortBy) filters.sortBy = req.query.sortBy as 'startDate' | 'name' | 'casualties' | 'status';
    if (req.query.sortOrder) filters.sortOrder = req.query.sortOrder as 'asc' | 'desc';

    if (req.query.page) filters.page = parseInt(req.query.page as string, 10);
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

    const result = await service.getAllConflicts(filters);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json(result);
  } catch (error) {
    console.error('getAllConflicts error:', error);
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
};

export const getConflictById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conflict = await service.getConflictById(id);

    if (!conflict) {
      res.status(404).json({ error: 'Conflict not found' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json(conflict);
  } catch (error) {
    console.error('getConflictById error:', error);
    res.status(500).json({ error: 'Failed to fetch conflict' });
  }
};

export const getConflictBySlug: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const conflict = await service.getConflictBySlug(slug);

    if (!conflict) {
      res.status(404).json({ error: 'Conflict not found' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json(conflict);
  } catch (error) {
    console.error('getConflictBySlug error:', error);
    res.status(500).json({ error: 'Failed to fetch conflict' });
  }
};

export const createConflict: RequestHandler = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const conflict = await service.createConflict(data);

    broadcastConflictUpdate({ id: conflict.id, type: 'created', data: conflict });

    res.status(201).json(conflict);
  } catch (error) {
    console.error('createConflict error:', error);
    res.status(500).json({ error: 'Failed to create conflict' });
  }
};

export const updateConflict: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const conflict = await service.updateConflict(id, data);

    const type = data.status ? 'status-changed' : 'updated';
    broadcastConflictUpdate({ id, type, data: conflict });

    res.json(conflict);
  } catch (error) {
    console.error('updateConflict error:', error);
    res.status(500).json({ error: 'Failed to update conflict' });
  }
};

export const deleteConflict: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await service.deleteConflict(id);

    broadcastConflictUpdate({ id, type: 'deleted' });

    res.status(204).send();
  } catch (error) {
    console.error('deleteConflict error:', error);
    res.status(500).json({ error: 'Failed to delete conflict' });
  }
};

export const getConflictStats: RequestHandler = async (req: Request, res: Response) => {
  try {
    const stats = await service.getConflictStatistics();
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
    res.json(stats);
  } catch (error) {
    console.error('getConflictStats error:', error);
    res.status(500).json({ error: 'Failed to fetch conflict statistics' });
  }
};

export const searchConflictsController: RequestHandler = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q || '').toString();
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const results = await service.searchConflicts(query, limit);
    res.json({ query, results });
  } catch (error) {
    console.error('searchConflicts error:', error);
    res.status(500).json({ error: 'Failed to search conflicts' });
  }
};

// ── News cache endpoints ──

export const getConflictNews: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const { getCachedNews } = await import('../../services/news-cache.service');
    const news = await getCachedNews(id, limit);

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json(news);
  } catch (error) {
    console.error('getConflictNews error:', error);
    res.status(500).json({ error: 'Failed to fetch conflict news' });
  }
};

export const cacheConflictNews: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const articles = req.body;

    if (!Array.isArray(articles)) {
      res.status(400).json({ error: 'Articles must be an array' });
      return;
    }

    const { cacheNewsArticles } = await import('../../services/news-cache.service');
    const cached = await cacheNewsArticles(id, articles);

    res.status(201).json({ cached: cached.length, total: articles.length });
  } catch (error) {
    console.error('cacheConflictNews error:', error);
    res.status(500).json({ error: 'Failed to cache conflict news' });
  }
};

export const deleteConflictNews: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { newsId } = req.params;

    await prisma.conflictNews.delete({ where: { id: newsId } });

    res.status(204).send();
  } catch (error) {
    console.error('deleteConflictNews error:', error);
    res.status(500).json({ error: 'Failed to delete conflict news' });
  }
};
