import { Router } from 'express';
import { getHealthByIso3 } from '../modules/indicators/controller';

const router = Router();

// Get health indicators for a specific country by ISO3
router.get('/:iso3', getHealthByIso3);

export default router;
