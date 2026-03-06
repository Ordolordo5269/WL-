import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { fetchAcledEvents, COUNTRY_NAME_MAP } from '../services/acled.service';

const router = Router();

// GET /api/acled/events
// Query: country (name or ISO2), dateFrom, dateTo, eventType, limit, page
router.get(
  '/events',
  asyncHandler(async (req: Request, res: Response) => {
    const { country, dateFrom, dateTo, eventType, limit, page } = req.query as Record<string, string>;

    // Resolve ISO2 → ACLED country name if needed
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
  })
);

// GET /api/acled/events/conflict/:countryIso
// Convenience endpoint — all accessible events for a conflict country, newest first.
// Optionally narrow with ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
router.get(
  '/events/conflict/:countryIso',
  asyncHandler(async (req: Request, res: Response) => {
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
      // Only apply date filters when explicitly requested
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      eventType: eventType || undefined,
      limit: limit ? Math.min(parseInt(limit, 10), 500) : 50,
      page: page ? parseInt(page, 10) : 1,
    });

    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    res.json(result);
  })
);

// GET /api/acled/countries
// Returns the full ISO→name map so the frontend can build dropdowns / resolve ISOs.
router.get(
  '/countries',
  (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({ countries: COUNTRY_NAME_MAP });
  }
);

export default router;
