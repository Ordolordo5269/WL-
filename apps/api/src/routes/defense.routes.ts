import { Router } from 'express';
import { getDefenseByIso3 } from '../controllers/defense.controller';

const router = Router();

// Get defense/military indicators for a specific country by ISO3
router.get('/:iso3', getDefenseByIso3);

export default router;













