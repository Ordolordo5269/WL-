import { Router } from 'express';
import { getMineralsController, getPipelinesController, getGasFlaringController } from '../controllers/geo-layers.controller';

const router = Router();

// GET /api/geo-layers/minerals?commodity=Gold&limit=5000
router.get('/minerals', getMineralsController);

// GET /api/geo-layers/pipelines?limit=2000
router.get('/pipelines', getPipelinesController);

// GET /api/geo-layers/gas-flaring?limit=2000
router.get('/gas-flaring', getGasFlaringController);

export default router;
