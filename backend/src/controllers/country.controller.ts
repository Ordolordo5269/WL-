import { Request, Response, RequestHandler } from 'express';
import {
  getCountriesFromDatabase,
  getCountryBasicInfo,
  searchCountries,
  getCountryByCode,
  getAllCountries
} from '../services/country.service';

export const listCountries: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await getCountriesFromDatabase();
    if (Array.isArray(data) && data.length > 0) {
      return res.json({ data, total: data.length });
    }
    // If cache is empty, return empty array instead of error
    return res.json({ data: [], total: 0, warning: 'Cache is empty' });
  } catch (error) {
    console.error('listCountries error:', error);
    // Return 200 with empty data instead of 500
    return res.status(200).json({ 
      data: [], 
      total: 0, 
      error: 'Failed to load countries cache' 
    });
  }
};

export const getCountryInfo: RequestHandler = async (req: Request, res: Response) => {
  const { countryName } = req.params as { countryName: string };
  try {
    const result = await getCountryBasicInfo(countryName);
    if (result.error) {
      const notFound = result.error.toLowerCase().includes('not found');
      res.status(notFound ? 404 : 500).json({ error: result.error });
      return;
    }
    res.json({ data: result.data });
  } catch (error) {
    console.error('getCountryInfo error:', error);
    res.status(500).json({ error: 'Failed to fetch country information' });
  }
};

export const searchCountriesByName: RequestHandler = async (req: Request, res: Response) => {
  const query = (req.query.q || req.query.query || '').toString();
  try {
    const result = await searchCountries(query);
    if (result.error) {
      res.status(500).json({ error: result.error, data: result.data, total: result.total });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('searchCountriesByName error:', error);
    res.status(500).json({ error: 'Failed to search countries' });
  }
};

export const getCountryByCodeController: RequestHandler = async (req: Request, res: Response) => {
  const { code } = req.params as { code: string };
  try {
    const result = await getCountryByCode(code);
    if (result.error) {
      const notFound = result.error.toLowerCase().includes('not found');
      res.status(notFound ? 404 : 500).json({ error: result.error });
      return;
    }
    res.json({ data: result.data });
  } catch (error) {
    console.error('getCountryByCodeController error:', error);
    res.status(500).json({ error: 'Failed to fetch country information' });
  }
};

export const getAllCountriesController: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const result = await getAllCountries();
    
    // If we got data (even with an error message), return it
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      return res.json({
        data: result.data,
        total: result.data.length,
        source: result.error ? 'database' : 'api',
        ...(result.error && { warning: result.error })
      });
    }
    
    // If no data from getAllCountries, try cache as last resort
    try {
      const cachedData = await getCountriesFromDatabase();
      if (Array.isArray(cachedData) && cachedData.length > 0) {
        console.log(`✅ Using cached countries (${cachedData.length} countries) as fallback`);
        return res.json({
          data: cachedData,
          total: cachedData.length,
          source: 'cache',
          warning: 'Using cached data as fallback'
        });
      }
    } catch (cacheError) {
      console.error('Failed to load cached countries:', cacheError);
    }
    
    // If everything fails, return empty array (not an error, just no data)
    console.warn('⚠️ No countries available from any source');
    return res.status(200).json({ 
      data: [], 
      total: 0, 
      warning: result.error || 'No countries available from any source'
    });
  } catch (error) {
    console.error('❌ getAllCountriesController error:', error);
    
    // Try cache as last resort before returning error
    try {
      const cachedData = await getCountriesFromDatabase();
      if (Array.isArray(cachedData) && cachedData.length > 0) {
        console.log(`✅ Using cached countries (${cachedData.length} countries) as fallback after error`);
        return res.json({
          data: cachedData,
          total: cachedData.length,
          source: 'cache',
          warning: 'Using cached data due to error'
        });
      }
    } catch (cacheError) {
      console.error('Failed to load cached countries:', cacheError);
    }
    
    // Return 200 with empty data instead of 500 to prevent frontend errors
    return res.status(200).json({ 
      data: [], 
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch countries'
    });
  }
};


