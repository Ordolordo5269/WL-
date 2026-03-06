import { Request, Response, NextFunction } from 'express';
import * as geoService from '../services/geodb.service';
import { logger } from '../core/logger';

/**
 * GET /api/geo/debug
 * Debug endpoint to check configuration
 */
export async function debugConfig(
  req: Request,
  res: Response
): Promise<void> {
  const apiKey = process.env.RAPIDAPI_KEY || '';
  res.json({
    rapidApiKeyPresent: !!apiKey,
    rapidApiKeyLength: apiKey.length,
    rapidApiKeyPrefix: apiKey.substring(0, 10) + '...',
    nodeEnv: process.env.NODE_ENV,
  });
}

/**
 * GET /api/geo/countries/:iso2/cities
 * Get top cities for a country
 */
export async function getCitiesByCountry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { iso2 } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    if (!iso2 || iso2.length !== 2) {
      res.status(400).json({ error: 'Valid ISO2 country code required' });
      return;
    }

    const cities = await geoService.getCitiesByCountry(iso2, limit);
    res.json({ data: cities, count: cities.length });
  } catch (error) {
    logger.error('Error in getCitiesByCountry', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}

/**
 * GET /api/geo/countries/:iso2/regions
 * Get administrative regions for a country
 */
export async function getRegionsByCountry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { iso2 } = req.params;

    if (!iso2 || iso2.length !== 2) {
      res.status(400).json({ error: 'Valid ISO2 country code required' });
      return;
    }

    const regions = await geoService.getRegionsByCountry(iso2);
    res.json({ data: regions, count: regions.length });
  } catch (error) {
    logger.error('Error in getRegionsByCountry', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}

/**
 * GET /api/geo/places/:placeId
 * Get details for a specific place
 */
export async function getPlaceDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      res.status(400).json({ error: 'Place ID required' });
      return;
    }

    const place = await geoService.getPlaceDetails(placeId);

    if (!place) {
      res.status(404).json({ error: 'Place not found' });
      return;
    }

    res.json({ data: place });
  } catch (error) {
    logger.error('Error in getPlaceDetails', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}

/**
 * GET /api/geo/search
 * Search places globally or within a country
 */
export async function searchPlaces(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q, countryCode, limit } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      res.status(400).json({ error: 'Query must be at least 2 characters' });
      return;
    }

    const parsedLimit = Math.min(parseInt(limit as string) || 10, 20);
    const places = await geoService.searchPlaces(
      q,
      countryCode as string | undefined,
      parsedLimit
    );

    res.json({ data: places, count: places.length });
  } catch (error) {
    logger.error('Error in searchPlaces', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}

/**
 * POST /api/geo/refresh/:iso2
 * Force refresh cache for a country (admin use)
 */
export async function refreshGeoCache(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { iso2 } = req.params;

    if (!iso2 || iso2.length !== 2) {
      res.status(400).json({ error: 'Valid ISO2 country code required' });
      return;
    }

    const result = await geoService.refreshCache(iso2);
    res.json({
      message: `Cache refreshed for ${iso2.toUpperCase()}`,
      ...result,
    });
  } catch (error) {
    logger.error('Error in refreshGeoCache', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}

/**
 * GET /api/geo/cache/status
 * Get cache status for monitoring
 */
export async function getCacheStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await geoService.getCacheStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error in getCacheStatus', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
}


