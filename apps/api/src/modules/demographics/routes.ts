import { Router, Request, Response } from 'express';
import { prisma } from '../../db/client.js';
import { fetchGlobalStats } from '../unhcr/client.js';

const router = Router();

const CACHE_HEADER = 'public, max-age=600, stale-while-revalidate=300';

function parseYear(val: unknown, fallback: number): number {
  const n = parseInt(String(val ?? ''), 10);
  return Number.isFinite(n) && n > 1900 && n < 2100 ? n : fallback;
}
function parseIntSafe(val: unknown, fallback: number): number {
  const n = parseInt(String(val ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// Canonical hub coords [lat, lng] keyed by ISO3 country code
// Overrides Joshua Project coords which can be skewed toward largest speaking population
const HUB_COORDS: Record<string, [number, number]> = {
  GBR: [51.5, -0.13],    // London — English
  ESP: [40.4, -3.7],     // Madrid — Spanish
  PRT: [38.7, -9.1],     // Lisbon — Portuguese
  FRA: [48.85, 2.35],    // Paris — French
  DEU: [52.5, 13.4],     // Berlin — German
  RUS: [55.75, 37.6],    // Moscow — Russian
  CHN: [39.9, 116.4],    // Beijing — Mandarin
  SAU: [24.7, 46.7],     // Riyadh — Arabic
  IND: [28.6, 77.2],     // Delhi — Hindi
  JPN: [35.7, 139.7],    // Tokyo — Japanese
  KOR: [37.6, 126.9],    // Seoul — Korean
  IRN: [35.7, 51.4],     // Tehran — Persian
  TUR: [39.9, 32.9],     // Ankara — Turkish
  ITA: [41.9, 12.5],     // Rome — Italian
  NLD: [52.4, 4.9],      // Amsterdam — Dutch
  POL: [52.2, 21.0],     // Warsaw — Polish
  UKR: [50.4, 30.5],     // Kyiv — Ukrainian
  SWE: [59.3, 18.1],     // Stockholm — Swedish
  NOR: [59.9, 10.7],     // Oslo — Norwegian
  FIN: [60.2, 24.9],     // Helsinki — Finnish
  VNM: [21.0, 105.8],    // Hanoi — Vietnamese
  THA: [13.8, 100.5],    // Bangkok — Thai
};

function applyHubCoords(l: { hubCountry?: string | null; lat?: number | null; lng?: number | null }) {
  if (!l.hubCountry) return { lat: l.lat, lng: l.lng };
  const override = HUB_COORDS[l.hubCountry];
  if (override) return { lat: override[0], lng: override[1] };
  return { lat: l.lat, lng: l.lng };
}

// ════════════════════════════════════════════════════════════════════
// LANGUAGES
// ════════════════════════════════════════════════════════════════════

// GET /api/demographics/languages
router.get('/languages', async (req: Request, res: Response) => {
  try {
    const { search, family, status, sort } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { iso639_3: { equals: String(search).toLowerCase() } },
      ];
    }
    if (family) where.family = String(family);
    if (status) where.status = String(status);

    const orderBy: any = sort === 'name' ? { name: 'asc' } : { speakers: 'desc' };

    const data = await prisma.language.findMany({ where, orderBy, take: 500 });

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({
      data: data.map(l => ({ ...l, speakers: Number(l.speakers), ...applyHubCoords(l) })),
      count: data.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/languages/families
router.get('/languages/families', async (_req: Request, res: Response) => {
  try {
    const families = await prisma.language.groupBy({
      by: ['family'],
      _count: true,
      _sum: { speakers: true },
      where: { family: { not: null } },
      orderBy: { _sum: { speakers: 'desc' } },
    });

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({
      data: families.map(f => ({
        family: f.family,
        count: f._count,
        totalSpeakers: Number(f._sum.speakers || 0),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/languages/:iso
router.get('/languages/:iso', async (req: Request, res: Response) => {
  try {
    const lang = await prisma.language.findUnique({ where: { iso639_3: req.params.iso } });
    if (!lang) return res.status(404).json({ error: 'Language not found' });
    res.json({ data: { ...lang, speakers: Number(lang.speakers), ...applyHubCoords(lang) } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════════
// RELIGION
// ════════════════════════════════════════════════════════════════════

// GET /api/demographics/religion
router.get('/religion', async (req: Request, res: Response) => {
  try {
    const { search, primaryReligion } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { countryName: { contains: String(search), mode: 'insensitive' } },
        { countryIso3: { equals: String(search).toUpperCase() } },
      ];
    }
    if (primaryReligion) where.primaryReligion = String(primaryReligion);

    const data = await prisma.religionStat.findMany({
      where,
      orderBy: { population: 'desc' },
    });

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({
      data: data.map(r => ({ ...r, population: Number(r.population) })),
      count: data.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/religion/summary
router.get('/religion/summary', async (_req: Request, res: Response) => {
  try {
    const stats = await prisma.religionStat.groupBy({
      by: ['primaryReligion'],
      _count: true,
      where: { primaryReligion: { not: null } },
      orderBy: { _count: { primaryReligion: 'desc' } },
    });

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({
      data: stats.map(s => ({ religion: s.primaryReligion, countries: s._count })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/religion/:iso3
router.get('/religion/:iso3', async (req: Request, res: Response) => {
  try {
    const stat = await prisma.religionStat.findUnique({ where: { countryIso3: req.params.iso3.toUpperCase() } });
    if (!stat) return res.status(404).json({ error: 'Country not found' });
    res.json({ data: { ...stat, population: Number(stat.population) } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════════
// DIASPORA / MIGRATION
// ════════════════════════════════════════════════════════════════════

// GET /api/demographics/diaspora/years — available years with data in DB
router.get('/diaspora/years', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.migrationCorridor.groupBy({
      by: ['year'],
      orderBy: { year: 'desc' },
    });
    const years = rows.map(r => r.year);
    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({ years, latest: years[0] ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/diaspora/totals — global aggregated totals for a year (fast — DB only)
router.get('/diaspora/totals', async (req: Request, res: Response) => {
  try {
    let year: number;
    if (req.query.year) {
      year = parseYear(req.query.year, new Date().getFullYear() - 1);
    } else {
      // Default to latest year with actual data in DB
      const latestRow = await prisma.migrationCorridor.findFirst({ orderBy: { year: 'desc' }, select: { year: true } });
      year = latestRow?.year ?? new Date().getFullYear() - 1;
    }

    // DB only — no external HTTP calls here so response is always fast
    const dbTotals = await prisma.migrationCorridor.aggregate({
      where: { year },
      _sum: {
        refugees: true,
        asylumSeekers: true,
        returnedRefugees: true,
        idps: true,
        stateless: true,
        otherOfConcern: true,
        hostCommunity: true,
      },
    });
    // globalStats fetched separately via /diaspora/global-stats

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({
      year,
      // From DB (population corridor data)
      totalRefugees: dbTotals._sum.refugees ?? 0,
      totalAsylumSeekers: dbTotals._sum.asylumSeekers ?? 0,
      totalReturnedRefugees: dbTotals._sum.returnedRefugees ?? 0,
      totalIDPs: dbTotals._sum.idps ?? 0,
      totalStateless: dbTotals._sum.stateless ?? 0,
      totalOtherOfConcern: dbTotals._sum.otherOfConcern ?? 0,
      totalHostCommunity: dbTotals._sum.hostCommunity ?? 0,
      // UNHCR solutions/decisions fetched separately via /diaspora/global-stats
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/diaspora/global-stats — live UNHCR solutions/decisions/applications
// Fetched separately from /totals so it doesn't block the fast DB response.
router.get('/diaspora/global-stats', async (req: Request, res: Response) => {
  try {
    const year = parseYear(req.query.year, new Date().getFullYear() - 1);
    const data = await fetchGlobalStats(year);
    res.setHeader('Cache-Control', CACHE_HEADER);
    const { year: _yr, ...stats } = data as unknown as Record<string, unknown>;
    res.json({ year, ...stats });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/diaspora/country-map — ALL origins + destinations (no limit) for choropleth
router.get('/diaspora/country-map', async (req: Request, res: Response) => {
  try {
    const year = parseYear(req.query.year, new Date().getFullYear() - 1);

    const [origins, destinations] = await Promise.all([
      prisma.migrationCorridor.groupBy({
        by: ['originIso3'],
        _sum: { refugees: true, idps: true, asylumSeekers: true },
        where: { year },
        orderBy: { _sum: { refugees: 'desc' } },
      }),
      prisma.migrationCorridor.groupBy({
        by: ['destinationIso3'],
        _sum: { refugees: true, asylumSeekers: true },
        where: { year },
        orderBy: { _sum: { refugees: 'desc' } },
      }),
    ]);

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({
      year,
      origins: origins.map(o => ({
        iso3: o.originIso3,
        total: (o._sum.refugees ?? 0) + (o._sum.idps ?? 0) + (o._sum.asylumSeekers ?? 0),
      })),
      destinations: destinations.map(d => ({
        iso3: d.destinationIso3,
        total: (d._sum.refugees ?? 0) + (d._sum.asylumSeekers ?? 0),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/diaspora
router.get('/diaspora', async (req: Request, res: Response) => {
  try {
    const { origin, destination, year, minRefugees } = req.query;

    const where: any = {};
    if (origin) where.originIso3 = String(origin).toUpperCase();
    if (destination) where.destinationIso3 = String(destination).toUpperCase();
    if (year) where.year = parseYear(year, 2023);
    if (minRefugees) where.refugees = { gte: parseIntSafe(minRefugees, 0) };

    const data = await prisma.migrationCorridor.findMany({
      where,
      orderBy: { refugees: 'desc' },
      take: 200,
    });

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({ data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/diaspora/top-origins
router.get('/diaspora/top-origins', async (req: Request, res: Response) => {
  try {
    const year = parseYear(req.query.year, new Date().getFullYear() - 1);

    const origins = await prisma.migrationCorridor.groupBy({
      by: ['originIso3', 'originName'],
      _sum: { refugees: true, asylumSeekers: true, idps: true, stateless: true, returnedRefugees: true, hostCommunity: true },
      where: { year },
      orderBy: { _sum: { refugees: 'desc' } },
      take: 30,
    });

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({
      data: origins.map(o => ({
        iso3: o.originIso3,
        name: o.originName,
        refugees: o._sum.refugees ?? 0,
        asylumSeekers: o._sum.asylumSeekers ?? 0,
        idps: o._sum.idps ?? 0,
        stateless: o._sum.stateless ?? 0,
        returnedRefugees: o._sum.returnedRefugees ?? 0,
        hostCommunity: o._sum.hostCommunity ?? 0,
      })),
      year,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/diaspora/top-destinations
router.get('/diaspora/top-destinations', async (req: Request, res: Response) => {
  try {
    const year = parseYear(req.query.year, new Date().getFullYear() - 1);

    const destinations = await prisma.migrationCorridor.groupBy({
      by: ['destinationIso3', 'destinationName'],
      _sum: { refugees: true, asylumSeekers: true },
      where: { year },
      orderBy: { _sum: { refugees: 'desc' } },
      take: 200,
    });

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({
      data: destinations.map(d => ({
        iso3: d.destinationIso3,
        name: d.destinationName,
        refugees: d._sum.refugees ?? 0,
        asylumSeekers: d._sum.asylumSeekers ?? 0,
      })),
      year,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/demographics/diaspora/country/:iso3
router.get('/diaspora/country/:iso3', async (req: Request, res: Response) => {
  try {
    const iso3 = req.params.iso3.toUpperCase();
    const year = parseYear(req.query.year, new Date().getFullYear() - 1);

    const [asOrigin, asDestination] = await Promise.all([
      prisma.migrationCorridor.findMany({
        where: { originIso3: iso3, year },
        orderBy: { refugees: 'desc' },
        take: 50,
      }),
      prisma.migrationCorridor.findMany({
        where: { destinationIso3: iso3, year },
        orderBy: { refugees: 'desc' },
        take: 50,
      }),
    ]);

    res.setHeader('Cache-Control', CACHE_HEADER);
    res.json({ asOrigin, asDestination, year });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
