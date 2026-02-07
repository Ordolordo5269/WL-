import { Request, Response, RequestHandler } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db/client';

interface AddFavoriteBody {
  countryIso3: string;
}

export const getFavorites: RequestHandler = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

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

    const { countryIso3 }: AddFavoriteBody = req.body;

    if (!countryIso3 || typeof countryIso3 !== 'string' || countryIso3.length !== 3) {
      return res.status(400).json({ error: 'Valid countryIso3 (3 characters) is required' });
    }

    // Check if favorite already exists
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_countryIso3: {
          userId,
          countryIso3: countryIso3.toUpperCase()
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Country is already in favorites' });
    }

    // Create favorite
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        countryIso3: countryIso3.toUpperCase()
      }
    });

    res.status(201).json({ favorite });
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

    // Delete favorite
    await prisma.favorite.deleteMany({
      where: {
        userId,
        countryIso3: countryIso3.toUpperCase()
      }
    });

    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    console.error('RemoveFavorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
};





