import { Request, Response, RequestHandler } from 'express';
import { getNaturalLayer, searchNatural } from '../services/natural.service';

export const getNaturalLayerController: RequestHandler = async (req: Request, res: Response) => {
  const { type } = req.params as { type: string };
  const { lod = 'auto', bbox, region, classMin, minElevation, limit } = req.query as Record<string, string | undefined>;
  try {
    const data = await getNaturalLayer({
      type,
      lod: lod as any,
      bbox,
      region,
      classMin: classMin ? Number(classMin) : undefined,
      minElevation: minElevation ? Number(minElevation) : undefined,
      limit: limit ? Number(limit) : undefined
    });
    // Either returns FeatureCollection or throws
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('X-WorldLore-Source', 'db');
    if (data.etag) res.setHeader('ETag', data.etag);
    res.json(data.body);
  } catch (e) {
    const msg = (e as Error).message || 'Failed to fetch natural layer';
    res.status(501).json({ error: msg });
  }
};

export const searchNaturalController: RequestHandler = async (req: Request, res: Response) => {
  const q = (req.query.q || '').toString();
  try {
    const results = await searchNatural(q);
    res.json({ q, results });
  } catch (e) {
    res.status(501).json({ error: (e as Error).message || 'Search not implemented' });
  }
};




