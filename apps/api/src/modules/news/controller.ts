import { Request, Response, RequestHandler } from 'express';
import {
  fetchConflictNews,
  fetchNewsForCountry,
  fetchNewsForConflict,
  fetchTopConflictHeadlines,
  fetchAcledEvents,
  COUNTRY_NAME_MAP,
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

// ── ACLED endpoints ──────────────────────────────────────────────────────────

export const getAcledEvents: RequestHandler = async (req: Request, res: Response) => {
  const { country, dateFrom, dateTo, eventType, limit, page } = req.query as Record<string, string>;

  const resolvedCountry = country
    ? (COUNTRY_NAME_MAP[country.toUpperCase()] ?? country)
    : undefined;

  const result = await fetchAcledEvents({
    country: resolvedCountry,
    eventType: eventType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: limit ? Math.min(parseInt(limit, 10), 500) : 50,
    page: page ? parseInt(page, 10) : 1,
  });

  res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
  res.json(result);
};

export const getAcledEventsByConflict: RequestHandler = async (req: Request, res: Response) => {
  const { countryIso } = req.params;
  const { limit, page, eventType, dateFrom, dateTo } = req.query as Record<string, string>;

  const resolvedCountry = COUNTRY_NAME_MAP[countryIso.toUpperCase()];
  if (!resolvedCountry) {
    res.status(400).json({
      error: `No ACLED country mapping for ISO "${countryIso}". Use /api/acled/events?country=<name> directly.`,
      supported: Object.keys(COUNTRY_NAME_MAP),
    });
    return;
  }

  const result = await fetchAcledEvents({
    country: resolvedCountry,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    eventType: eventType || undefined,
    limit: limit ? Math.min(parseInt(limit, 10), 500) : 50,
    page: page ? parseInt(page, 10) : 1,
  });

  res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
  res.json(result);
};

export const getAcledCountries: RequestHandler = (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json({ countries: COUNTRY_NAME_MAP });
};
