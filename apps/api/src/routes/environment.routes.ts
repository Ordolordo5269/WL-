import { Router } from 'express';
import { getEnvironmentByIso3 } from '../modules/indicators/controller';

const router = Router();

// Get environment indicators for a specific country by ISO3
router.get('/:iso3', getEnvironmentByIso3);

export default router;
