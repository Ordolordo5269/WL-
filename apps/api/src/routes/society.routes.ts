import { Router } from 'express';
import { getSocietyByIso3, getWorldBankSeries } from '../controllers/society.controller';

const router = Router();

// Proxy endpoint for World Bank API time series data (must be before /:iso3 route)
// GET /api/society/:iso3/worldbank/:indicator?limitYears=20
router.get('/:iso3/worldbank/:indicator', getWorldBankSeries);

// Get society/demographic indicators for a specific country by ISO3
router.get('/:iso3', getSocietyByIso3);

export default router;
