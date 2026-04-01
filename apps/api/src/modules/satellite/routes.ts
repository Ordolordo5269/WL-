import { Router } from 'express';
import { getSatelliteTLE, getSatelliteProfiles } from './controller';

const router = Router();

// GET /api/satellite/tle?group=military|weather|starlink|...
router.get('/tle', getSatelliteTLE);

// GET /api/satellite/profiles — all satellite profiles for client-side lookup
router.get('/profiles', getSatelliteProfiles);

export default router;
