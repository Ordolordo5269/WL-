import { Request, Response, RequestHandler } from 'express';
import { getHistoryLayer } from '../services/history.service';

export const getHistoryLayerController: RequestHandler = async (req: Request, res: Response) => {
  const { year } = req.query as Record<string, string | undefined>;
  const { lod, limit } = req.query as Record<string, string | undefined>;
  try {
    const y = year ? Number(year) : NaN;
    if (!Number.isFinite(y)) {
      res.status(400).json({ error: 'year is required' });
      return;
    }
    const data = await getHistoryLayer({
      year: y,
      lod: (lod as any) || 'auto',
      limit: limit ? Number(limit) : undefined
    });
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('X-WorldLore-Source', 'db');
    if (data.etag) res.setHeader('ETag', data.etag);
    res.json(data.body);
  } catch (e) {
    res.status(501).json({ error: (e as Error).message || 'Failed to fetch history layer' });
  }
};






















