import { Router } from 'express';
import { getSatelliteTLE, getSatelliteProfiles } from './controller';
import { getMissions, getMissionDetail } from './missions-controller';
import { getCrew } from './crew-controller';

const router = Router();

// GET /api/satellite/tle?group=military|weather|starlink|...
router.get('/tle', getSatelliteTLE);

// GET /api/satellite/profiles — all satellite profiles for client-side lookup
router.get('/profiles', getSatelliteProfiles);

// GET /api/satellite/crew — astronauts currently in space
router.get('/crew', getCrew);

// GET /api/satellite/missions — active + upcoming missions from Launch Library 2
router.get('/missions', getMissions);

// GET /api/satellite/missions/:id — mission detail
router.get('/missions/:id', getMissionDetail);

export default router;
