import { Request, Response, RequestHandler } from 'express';
import * as service from './service';
import { SLUG_TO_CODE } from './types';

// ── Economy ──

export const getEconomyByIso3: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    const data = await service.getEconomyData(iso3Param);
    if (!data) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('getEconomyByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch economy data from database' });
  }
};

// ── Defense ──

export const getDefenseByIso3: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    const data = await service.getDefenseData(iso3Param);
    if (!data) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('getDefenseByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch defense data from database' });
  }
};

// ── Politics ──

export const getPoliticsByIso3: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    const data = await service.getPoliticsData(iso3Param);
    if (!data) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('getPoliticsByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch politics data from database' });
  }
};

// ── GDP ──

export const getGdpLatest: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await service.getGdpLatestByIso3();
    const count = Object.keys(data).length;
    console.log(`GDP API: Returning ${count} countries with GDP data`);
    res.json(data);
  } catch (error) {
    console.error('getGdpLatest error:', error);
    res.status(500).json({
      error: 'Failed to fetch GDP data from database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getGdpByCountry: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { iso3 } = req.params;
    if (!iso3 || iso3.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    const data = await service.getGdpByIso3(iso3);
    if (!data) {
      return res.status(404).json({ error: 'GDP data not found for this country' });
    }
    res.json(data);
  } catch (error) {
    console.error('getGdpByCountry error:', error);
    res.status(500).json({
      error: 'Failed to fetch GDP data from database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ── GDP Per Capita ──

export const getGdpPerCapitaLatest: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await service.getGdpPerCapitaLatestByIso3();
    const count = Object.keys(data).length;
    console.log(`GDP Per Capita API: Returning ${count} countries with GDP per capita data`);
    res.json(data);
  } catch (error) {
    console.error('getGdpPerCapitaLatest error:', error);
    res.status(500).json({
      error: 'Failed to fetch GDP per capita data from database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getGdpPerCapitaByCountry: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { iso3 } = req.params;
    if (!iso3 || iso3.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    const data = await service.getGdpPerCapitaByIso3(iso3);
    if (!data) {
      return res.status(404).json({ error: 'GDP per capita data not found for this country' });
    }
    res.json(data);
  } catch (error) {
    console.error('getGdpPerCapitaByCountry error:', error);
    res.status(500).json({
      error: 'Failed to fetch GDP per capita data from database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ── Inflation ──

export const getInflationLatest: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await service.getInflationLatestByIso3();
    const count = Object.keys(data).length;
    console.log(`Inflation API: Returning ${count} countries with inflation data`);
    res.json(data);
  } catch (error) {
    console.error('getInflationLatest error:', error);
    res.status(500).json({
      error: 'Failed to fetch Inflation data from database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getInflationByCountry: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { iso3 } = req.params;
    if (!iso3 || iso3.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    const data = await service.getInflationByIso3(iso3);
    if (!data) {
      return res.status(404).json({ error: 'Inflation data not found for this country' });
    }
    res.json(data);
  } catch (error) {
    console.error('getInflationByCountry error:', error);
    res.status(500).json({
      error: 'Failed to fetch Inflation data from database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ── Generic indicator by slug ──

export const getIndicatorLatest: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Invalid indicator slug' });
    }
    const data = await service.getIndicatorLatestBySlug(slug);
    const count = Object.keys(data).length;
    console.log(`Indicator API (${slug}): Returning ${count} countries with data`);
    res.json(data);
  } catch (error) {
    console.error(`getIndicatorLatest error (${req.params.slug}):`, error);
    res.status(500).json({
      error: 'Failed to fetch indicator data from database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ── Time Series ──

export const getIndicatorTimeSeriesController: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug, iso3 } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Invalid indicator slug' });
    }
    if (!iso3 || iso3.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }

    const indicatorCode = SLUG_TO_CODE[slug];
    if (!indicatorCode) {
      return res.status(400).json({ error: `Unsupported indicator slug: ${slug}` });
    }

    const startYear = req.query.startYear ? Number(req.query.startYear) : undefined;
    const endYear = req.query.endYear ? Number(req.query.endYear) : undefined;

    if (startYear !== undefined && (!Number.isFinite(startYear) || startYear < 1900 || startYear > 2100)) {
      return res.status(400).json({ error: 'Invalid startYear' });
    }
    if (endYear !== undefined && (!Number.isFinite(endYear) || endYear < 1900 || endYear > 2100)) {
      return res.status(400).json({ error: 'Invalid endYear' });
    }

    const data = await service.getIndicatorTimeSeries(iso3, indicatorCode, startYear, endYear);
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.json(data);
  } catch (error) {
    console.error(`getIndicatorTimeSeries error (${req.params.slug}/${req.params.iso3}):`, error);
    res.status(500).json({
      error: 'Failed to fetch time series data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ── Society ──

export const getSocietyByIso3: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    const data = await service.getSocietyData(iso3Param);
    if (!data) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('getSocietyByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch society data from database' });
  }
};

export const getWorldBankSeries: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    const indicatorCode = String(req.params.indicator || '').trim();
    const limitYears = req.query.limitYears ? parseInt(String(req.query.limitYears), 10) : undefined;

    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    if (!indicatorCode) {
      return res.status(400).json({ error: 'Indicator code is required' });
    }

    const data = await service.getWorldBankSeriesData(iso3Param, indicatorCode, limitYears);
    res.json(data);
  } catch (error) {
    console.error('getWorldBankSeries DB fallback error:', error);
    res.json([]);
  }
};

// ── Technology ──

export const getTechnologyByIso3: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    const data = await service.getTechnologyData(iso3Param);
    if (!data) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('getTechnologyByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch technology data from database' });
  }
};

// ── International ──

export const getInternationalByIso3: RequestHandler = async (req: Request, res: Response) => {
  try {
    const iso3Param = String(req.params.iso3 || '').toUpperCase();
    if (!iso3Param || iso3Param.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }
    const data = await service.getInternationalData(iso3Param);
    if (!data) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('getInternationalByIso3 error:', error);
    res.status(500).json({ error: 'Failed to fetch international data from database' });
  }
};

// ── Batch ──

export const getIndicatorBatch: RequestHandler = async (req: Request, res: Response) => {
  try {
    const rawSlugs = req.query.slugs;
    if (!rawSlugs || typeof rawSlugs !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "slugs" query param. Example: ?slugs=gdp,inflation,gini' });
    }

    const slugs = rawSlugs.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (slugs.length === 0) {
      return res.status(400).json({ error: 'No valid slugs provided' });
    }
    if (slugs.length > 20) {
      return res.status(400).json({ error: 'Too many slugs (max 20)' });
    }

    const result = await service.getIndicatorBatch(slugs);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    res.json(result);
  } catch (error) {
    console.error('getIndicatorBatch error:', error);
    res.status(500).json({
      error: 'Failed to fetch batch indicator data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
