import { Router } from 'express';
import { getCommoditiesByIso3 } from '../modules/indicators/controller';

const router = Router();

// Get raw materials / commodities indicators for a specific country by ISO3
router.get('/:iso3', getCommoditiesByIso3);

export default router;
