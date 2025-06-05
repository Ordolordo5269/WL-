import { Request, Response } from 'express';
import { getCountries } from '../services/country.service';

export async function listCountries(req: Request, res: Response) {
  try {
    const countries = await getCountries();
    res.json(countries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load countries' });
  }
}
