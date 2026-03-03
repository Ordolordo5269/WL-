import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  fetchConflictNews,
  fetchNewsForCountry,
  fetchNewsForConflict,
  fetchTopConflictHeadlines,
} from '../services/news-api.service';

const router = Router();

// GET /api/news/conflicts - General conflict news
router.get(
  '/conflicts',
  asyncHandler(async (req: Request, res: Response) => {
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
    const articles = await fetchConflictNews(Math.min(pageSize, 50));

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    res.json({ articles, total: articles.length });
  })
);

// GET /api/news/headlines - Top conflict headlines
router.get(
  '/headlines',
  asyncHandler(async (req: Request, res: Response) => {
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 15;
    const articles = await fetchTopConflictHeadlines(Math.min(pageSize, 30));

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    res.json({ articles, total: articles.length });
  })
);

// GET /api/news/country/:country - News for a specific country
router.get(
  '/country/:country',
  asyncHandler(async (req: Request, res: Response) => {
    const { country } = req.params;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
    const articles = await fetchNewsForCountry(country, Math.min(pageSize, 30));

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    res.json({ articles, total: articles.length });
  })
);

// GET /api/news/conflict?country=X&type=Y - News for a specific conflict
router.get(
  '/conflict',
  asyncHandler(async (req: Request, res: Response) => {
    const country = (req.query.country as string) || '';
    const conflictType = (req.query.type as string) || '';
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 8;

    if (!country) {
      res.status(400).json({ error: 'country query parameter is required' });
      return;
    }

    const articles = await fetchNewsForConflict(country, conflictType, Math.min(pageSize, 30));

    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    res.json({ articles, total: articles.length });
  })
);

export default router;
