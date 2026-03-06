import { Request, Response, RequestHandler } from 'express';
import { findCountriesByName, getCountryBasicInfoByName, getCountryByIsoCode, listAllCountries, getOverview } from './service';
import { iso3ParamsSchema } from './schemas.js';

export const list: RequestHandler = async (_req: Request, res: Response) => {
  const result = await listAllCountries();
  res.json(result);
};

export const byCode: RequestHandler = async (req: Request, res: Response) => {
  const { code } = req.params as { code: string };
  const result = await getCountryByIsoCode(code);
  if (result.error) {
    const notFound = result.error.toLowerCase().includes('not found');
    res.status(notFound ? 404 : 500).json({ error: result.error });
    return;
  }
  res.json({ data: result.data });
};

export const basicInfoByName: RequestHandler = async (req: Request, res: Response) => {
  const { countryName } = req.params as { countryName: string };
  const result = await getCountryBasicInfoByName(countryName);
  if (result.error) {
    const notFound = result.error.toLowerCase().includes('not found');
    res.status(notFound ? 404 : 500).json({ error: result.error });
    return;
  }
  res.json({ data: result.data });
};

export const searchByName: RequestHandler = async (req: Request, res: Response) => {
  const q = (req.query.q || req.query.query || '').toString();
  const result = await findCountriesByName(q);
  res.json(result);
};

export const getCountryOverview: RequestHandler = async (req: Request, res: Response) => {
  const parsed = iso3ParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid ISO3 code', details: parsed.error.issues });
    return;
  }

  const overview = await getOverview(parsed.data.iso3);
  if (!overview) {
    res.status(404).json({ error: 'Country not found' });
    return;
  }

  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json({ data: overview });
};






