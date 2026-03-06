import { Request, Response, RequestHandler } from 'express';
import * as service from './service.js';
import type { InsightRequest } from './types.js';

export const create: RequestHandler = async (req: Request, res: Response) => {
  const body = req.body as InsightRequest;
  const insight = await service.generateInsight(body);

  if (!insight) {
    res.status(404).json({ error: 'Entity not found' });
    return;
  }

  res.json({ data: insight });
};
