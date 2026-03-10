import { Router } from 'express';
import {
  getAcledEvents,
  getAcledEventsByConflict,
  getAcledCountries,
} from '../modules/news/controller';

const router = Router();

// GET /api/acled/events
router.get('/events', getAcledEvents);

// GET /api/acled/events/conflict/:countryIso
router.get('/events/conflict/:countryIso', getAcledEventsByConflict);

// GET /api/acled/countries
router.get('/countries', getAcledCountries);

export default router;
