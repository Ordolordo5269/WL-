import { Request, Response, RequestHandler } from 'express';
import {
  fetchConflictNews,
  fetchNewsForCountry,
  fetchNewsForConflict,
  fetchTopConflictHeadlines,
} from './service';

// ── News endpoints ───────────────────────────────────────────────────────────

export const getConflictNews: RequestHandler = async (req: Request, res: Response) => {
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
  const articles = await fetchConflictNews(Math.min(pageSize, 50));
  res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
  res.json({ articles, total: articles.length });
};

export const getHeadlines: RequestHandler = async (req: Request, res: Response) => {
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 15;
  const articles = await fetchTopConflictHeadlines(Math.min(pageSize, 30));
  res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
  res.json({ articles, total: articles.length });
};

export const getCountryNews: RequestHandler = async (req: Request, res: Response) => {
  const { country } = req.params;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
  const articles = await fetchNewsForCountry(country, Math.min(pageSize, 30));
  res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
  res.json({ articles, total: articles.length });
};

export const getConflictSpecificNews: RequestHandler = async (req: Request, res: Response) => {
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
};

