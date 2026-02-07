import { Router } from 'express';
import { getEconomyByIso3 } from '../controllers/economy.controller';

const router = Router();

// Aggregate economy metrics for a specific country by ISO3 (all from DB)
router.get('/:iso3', getEconomyByIso3);

export default router;

















