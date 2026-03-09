import { Request, Response, RequestHandler } from 'express';
import { getMineralsGeoJSON, getPipelinesGeoJSON, getGasFlaringGeoJSON } from '../services/geo-layers.service';

export const getMineralsController: RequestHandler = async (req: Request, res: Response) => {
  const { commodity, limit } = req.query as Record<string, string | undefined>;
  try {
    const data = await getMineralsGeoJSON({
      commodity,
      limit: limit ? Number(limit) : undefined
    });
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (data.etag) res.setHeader('ETag', data.etag);
    res.json(data.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message || 'Failed to fetch minerals layer' });
  }
};

export const getPipelinesController: RequestHandler = async (req: Request, res: Response) => {
  const { limit } = req.query as Record<string, string | undefined>;
  try {
    const data = await getPipelinesGeoJSON({
      limit: limit ? Number(limit) : undefined
    });
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (data.etag) res.setHeader('ETag', data.etag);
    res.json(data.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message || 'Failed to fetch pipelines layer' });
  }
};

export const getGasFlaringController: RequestHandler = async (req: Request, res: Response) => {
  const { limit } = req.query as Record<string, string | undefined>;
  try {
    const data = await getGasFlaringGeoJSON({
      limit: limit ? Number(limit) : undefined
    });
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (data.etag) res.setHeader('ETag', data.etag);
    res.json(data.body);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message || 'Failed to fetch gas flaring layer' });
  }
};
