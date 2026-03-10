import { Request, Response, RequestHandler } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as service from './service';

// ── Profile ──────────────────────────────────────────────────────────────────

export const updateProfile: RequestHandler = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, email } = req.body;
    const result = await service.updateProfile(userId, { name, email });

    if ('error' in result) {
      const status = result.error === 'No fields to update' ? 400 : 409;
      return res.status(status).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ── Favorites ────────────────────────────────────────────────────────────────

export const getFavorites: RequestHandler = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const favorites = await service.getFavorites(userId);
    res.json({ favorites });
  } catch (error) {
    console.error('GetFavorites error:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
};

export const addFavorite: RequestHandler = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { countryIso3 } = req.body;

    if (!countryIso3 || typeof countryIso3 !== 'string' || countryIso3.length !== 3) {
      return res.status(400).json({ error: 'Valid countryIso3 (3 characters) is required' });
    }

    const result = await service.addFavorite(userId, countryIso3);

    if ('error' in result) {
      return res.status(409).json({ error: result.error });
    }

    res.status(201).json({ favorite: result });
  } catch (error) {
    console.error('AddFavorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
};

export const removeFavorite: RequestHandler = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { countryIso3 } = req.params;

    if (!countryIso3 || countryIso3.length !== 3) {
      return res.status(400).json({ error: 'Valid countryIso3 (3 characters) is required' });
    }

    await service.removeFavorite(userId, countryIso3);
    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    console.error('RemoveFavorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
};
