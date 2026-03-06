import { Router } from 'express';
import { getGdpLatest, getGdpByCountry, getGdpPerCapitaLatest, getGdpPerCapitaByCountry, getInflationLatest, getInflationByCountry, getIndicatorLatest, getIndicatorTimeSeriesController, getIndicatorBatch } from '../controllers/indicator.controller';

const router = Router();

// Batch: fetch multiple indicators in a single request
// GET /api/indicators/batch?slugs=gdp,inflation,gini,...
router.get('/batch', getIndicatorBatch);

// Get latest GDP values for all countries from database
router.get('/gdp/latest', getGdpLatest);

// Get GDP for a specific country by ISO3
router.get('/gdp/:iso3', getGdpByCountry);

// Get latest GDP per capita values for all countries from database
router.get('/gdp-per-capita/latest', getGdpPerCapitaLatest);

// Get GDP per capita for a specific country by ISO3
router.get('/gdp-per-capita/:iso3', getGdpPerCapitaByCountry);

// Get latest Inflation (annual %) for all countries from database
router.get('/inflation/latest', getInflationLatest);

// Get Inflation (annual %) for a specific country by ISO3
router.get('/inflation/:iso3', getInflationByCountry);

// Get time series for a specific indicator and country
// GET /api/indicators/:slug/timeseries/:iso3?startYear=YYYY&endYear=YYYY
// Supports: gdp, gdp-per-capita, inflation, gini, exports, imports, unemployment, debt
router.get('/:slug/timeseries/:iso3', getIndicatorTimeSeriesController);

// Generic endpoint to get latest indicator values for all countries by slug
// Supports: gdp, gdp-per-capita, inflation, gini, exports, imports, unemployment, debt
router.get('/:slug/latest', getIndicatorLatest);

export default router;

