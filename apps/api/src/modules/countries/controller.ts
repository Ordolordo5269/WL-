import { Request, Response, RequestHandler } from 'express';
import { findCountriesByName, getCountryBasicInfoByName, getCountryByIsoCode, listAllCountries } from './service';

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






