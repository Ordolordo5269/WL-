import { Request, Response, RequestHandler } from 'express';
import {
  getCountries,
  getCountryBasicInfo,
  searchCountries,
  getCountryByCode,
  getAllCountries
} from '../services/country.service';

export const listCountries: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const data = await getCountries();
    res.json({ data, total: Array.isArray(data) ? data.length : undefined });
  } catch (error) {
    console.error('listCountries error:', error);
    res.status(500).json({ error: 'Failed to load countries cache' });
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
    if (result.error) {
      res.status(500).json({ error: result.error, data: result.data, total: result.total });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('getAllCountriesController error:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
};


