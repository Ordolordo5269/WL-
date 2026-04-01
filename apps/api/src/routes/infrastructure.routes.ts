import { Router } from 'express';
import { getInfrastructureByIso3 } from '../modules/indicators/controller';

const router = Router();

// Get infrastructure & connectivity indicators for a specific country by ISO3
router.get('/:iso3', getInfrastructureByIso3);

export default router;
