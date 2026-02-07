import { Request, Response, RequestHandler } from 'express';
import { getGdpLatestByIso3, getGdpByIso3, getGdpPerCapitaLatestByIso3, getGdpPerCapitaByIso3, getInflationLatestByIso3, getInflationByIso3, getIndicatorLatestBySlug, getIndicatorTimeSeries } from '../services/indicator.service';

export const getGdpLatest: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await getGdpLatestByIso3();
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
    
    const data = await getGdpByIso3(iso3);
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

export const getGdpPerCapitaLatest: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await getGdpPerCapitaLatestByIso3();
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
    
    const data = await getGdpPerCapitaByIso3(iso3);
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

export const getInflationLatest: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await getInflationLatestByIso3();
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
    const data = await getInflationByIso3(iso3);
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

/**
 * Generic endpoint to get latest indicator values for all countries by slug
 * Supports: gdp, gdp-per-capita, inflation, gini, exports, imports, unemployment, debt
 */
export const getIndicatorLatest: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Invalid indicator slug' });
    }
    
    const data = await getIndicatorLatestBySlug(slug);
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

/**
 * Get time series for a specific indicator and country
 * GET /api/indicators/:slug/timeseries/:iso3?startYear=YYYY&endYear=YYYY
 */
export const getIndicatorTimeSeriesController: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { slug, iso3 } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Invalid indicator slug' });
    }
    if (!iso3 || iso3.length !== 3) {
      return res.status(400).json({ error: 'Invalid ISO3 code' });
    }

    // Map slug to indicator code
    const SLUG_TO_CODE: Record<string, string> = {
      // Economy
      'gdp': 'GDP_USD',
      'gdp-per-capita': 'GDP_PC_USD',
      'inflation': 'INFLATION_CPI_YOY_PCT',
      'gini': 'GINI_INDEX',
      'exports': 'EXPORTS_USD',
      'imports': 'IMPORTS_USD',
      'unemployment': 'UNEMPLOYMENT_RATE_PERCENT',
      'debt': 'EXTERNAL_DEBT_USD',
      'population-growth': 'POPULATION_GROWTH',
      // Politics (WGI Indicators)
      'political-stability': 'WGI_POLITICAL_STABILITY',
      'voice-accountability': 'WGI_VOICE_ACCOUNTABILITY',
      'government-effectiveness': 'WGI_GOVERNMENT_EFFECTIVENESS',
      'regulatory-quality': 'WGI_REGULATORY_QUALITY',
      'rule-of-law': 'WGI_RULE_OF_LAW',
      'control-of-corruption': 'WGI_CONTROL_CORRUPTION',
      // Defense
      'military-expenditure-pct-gdp': 'MILITARY_EXPENDITURE_PCT_GDP',
      'military-expenditure-usd': 'MILITARY_EXPENDITURE_USD',
      'armed-forces-personnel': 'ARMED_FORCES_PERSONNEL_TOTAL',
      'arms-imports': 'ARMS_IMPORTS_TIV',
      'arms-exports': 'ARMS_EXPORTS_TIV',
      'battle-deaths': 'BATTLE_RELATED_DEATHS',
      // International
      'oda-received': 'ODA_RECEIVED_USD',
      'trade-percent-gdp': 'TRADE_PERCENT_GDP',
      'current-account': 'CURRENT_ACCOUNT_USD',
      'fdi-inflows': 'FDI_NET_INFLOWS_USD',
      'fdi-outflows': 'FDI_NET_OUTFLOWS_USD',
      'remittances': 'REMITTANCES_USD'
    };

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

    const data = await getIndicatorTimeSeries(iso3, indicatorCode, startYear, endYear);
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

