import { Request, Response, RequestHandler } from 'express';
import * as service from './service.js';
import type { ConflictFilters } from './types.js';

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
