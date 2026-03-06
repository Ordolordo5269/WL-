import { Router } from 'express';
import { getTechnologyByIso3 } from '../controllers/technology.controller';

const router = Router();

// Get technology/R&D indicators for a specific country by ISO3
router.get('/:iso3', getTechnologyByIso3);

export default router;













