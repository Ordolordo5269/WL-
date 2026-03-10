import { Router } from 'express';
import {
  getConflictNews,
  getHeadlines,
  getCountryNews,
  getConflictSpecificNews,
} from '../modules/news/controller';

const router = Router();

// GET /api/news/conflicts - General conflict news
router.get('/conflicts', getConflictNews);

// GET /api/news/headlines - Top conflict headlines
router.get('/headlines', getHeadlines);

// GET /api/news/country/:country - News for a specific country
router.get('/country/:country', getCountryNews);

// GET /api/news/conflict?country=X&type=Y - News for a specific conflict
router.get('/conflict', getConflictSpecificNews);

export default router;
