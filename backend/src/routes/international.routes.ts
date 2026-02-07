import { Router } from 'express';
import { getInternationalByIso3 } from '../controllers/international.controller';

const router = Router();

// Get international trade/finance indicators for a specific country by ISO3
router.get('/:iso3', getInternationalByIso3);

export default router;













