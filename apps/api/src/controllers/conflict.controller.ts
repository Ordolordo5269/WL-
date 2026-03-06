import { Request, Response } from 'express';
import {
  getAllConflicts,
  getConflictById,
  getConflictBySlug,
  createConflict,
  updateConflict,
  deleteConflict,
  getConflictStatistics,
  searchConflicts,
  type ConflictFilters
} from '../services/conflict.service';
import { ConflictStatus } from '@prisma/client';
import { prisma } from '../db/client';
import { broadcastConflictUpdate } from '../index';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../core/errors/AppError';

/**
 * GET /api/conflicts
 * Query params: 
 *   - Basic: region, status, country, conflictType, search
 *   - Date: startDateFrom, startDateTo, escalationDateFrom, escalationDateTo, activeOnly
 *   - Casualties: casualtiesMin, casualtiesMax
 *   - Sorting: sortBy (startDate|name|casualties|status), sortOrder (asc|desc)
 *   - Pagination: page, limit
 */
export const getAllConflictsController = asyncHandler(async (req: Request, res: Response) => {
  const filters: ConflictFilters = {};

  // Basic filters
  if (req.query.region) filters.region = req.query.region as string;
  if (req.query.status) filters.status = req.query.status as ConflictStatus;
  if (req.query.country) filters.country = req.query.country as string;
  if (req.query.conflictType) filters.conflictType = req.query.conflictType as string;
  if (req.query.search) filters.search = req.query.search as string;

  // Date filters
  if (req.query.startDateFrom) filters.startDateFrom = req.query.startDateFrom as string;
  if (req.query.startDateTo) filters.startDateTo = req.query.startDateTo as string;
  if (req.query.escalationDateFrom) filters.escalationDateFrom = req.query.escalationDateFrom as string;
  if (req.query.escalationDateTo) filters.escalationDateTo = req.query.escalationDateTo as string;
  if (req.query.activeOnly === 'true') filters.activeOnly = true;

  // Casualty filters
  if (req.query.casualtiesMin) filters.casualtiesMin = parseInt(req.query.casualtiesMin as string, 10);
  if (req.query.casualtiesMax) filters.casualtiesMax = parseInt(req.query.casualtiesMax as string, 10);

  // Sorting
  if (req.query.sortBy) filters.sortBy = req.query.sortBy as 'startDate' | 'name' | 'casualties' | 'status';
  if (req.query.sortOrder) filters.sortOrder = req.query.sortOrder as 'asc' | 'desc';

  // Pagination
  if (req.query.page) filters.page = parseInt(req.query.page as string, 10);
  if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

  const result = await getAllConflicts(filters);
  
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json(result);
});

/**
 * GET /api/conflicts/:id
 */
export const getConflictByIdController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const conflict = await getConflictById(id);

  if (!conflict) {
    throw AppError.notFound('Conflict not found', { id });
  }

  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json(conflict);
});

/**
 * GET /api/conflicts/slug/:slug
 */
export const getConflictBySlugController = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const conflict = await getConflictBySlug(slug);

  if (!conflict) {
    throw AppError.notFound('Conflict not found', { slug });
  }

  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json(conflict);
});

/**
 * POST /api/conflicts
 * Body: CreateConflictData
 */
export const createConflictController = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const conflict = await createConflict(data);
  
  // Emit WebSocket event
  broadcastConflictUpdate({
    id: conflict.id,
    type: 'created',
    data: conflict
  });
  
  res.status(201).json(conflict);
});

/**
 * PUT /api/conflicts/:id
 * Body: Partial<CreateConflictData>
 */
export const updateConflictController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const conflict = await updateConflict(id, data);
  
  // Determine if this is a status change or generic update
  const type = data.status ? 'status-changed' : 'updated';
  broadcastConflictUpdate({
    id,
    type,
    data: conflict
  });
  
  res.json(conflict);
});

/**
 * DELETE /api/conflicts/:id
 */
export const deleteConflictController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await deleteConflict(id);
  
  broadcastConflictUpdate({
    id,
    type: 'deleted'
  });
  
  res.status(204).send();
});

/**
 * GET /api/conflicts/stats
 */
export const getConflictStatsController = asyncHandler(async (req: Request, res: Response) => {
  const stats = await getConflictStatistics();
  res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
  res.json(stats);
});

/**
 * GET /api/conflicts/search?q=...
 */
export const searchConflictsController = asyncHandler(async (req: Request, res: Response) => {
  const query = (req.query.q || '').toString();
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  
  if (!query) {
    throw AppError.badRequest('Search query is required', { query: req.query.q });
  }

  const results = await searchConflicts(query, limit);
  res.json({ query, results });
});

/**
 * GET /api/conflicts/:id/news
 * Get cached news for a conflict
 */
export const getConflictNewsController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  const { getCachedNews } = await import('../services/news-cache.service');
  const news = await getCachedNews(id, limit);

  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json(news);
});

/**
 * POST /api/conflicts/:id/news
 * Cache news articles for a conflict
 */
export const cacheConflictNewsController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const articles = req.body;

  if (!Array.isArray(articles)) {
    throw AppError.badRequest('Articles must be an array', { received: typeof articles });
  }

  const { cacheNewsArticles } = await import('../services/news-cache.service');
  const cached = await cacheNewsArticles(id, articles);

  res.status(201).json({ cached: cached.length, total: articles.length });
});

/**
 * DELETE /api/conflicts/:id/news/:newsId
 * Delete cached news article
 */
export const deleteConflictNewsController = asyncHandler(async (req: Request, res: Response) => {
  const { newsId } = req.params;
  
  await prisma.conflictNews.delete({
    where: { id: newsId }
  });

  res.status(204).send();
});

