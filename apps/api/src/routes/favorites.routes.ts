import { Router } from 'express';
import { getFavorites, addFavorite, removeFavorite } from '../controllers/favorites.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.get('/', authenticate, getFavorites);
router.post('/', authenticate, addFavorite);
router.delete('/:countryIso3', authenticate, removeFavorite);

export default router;





