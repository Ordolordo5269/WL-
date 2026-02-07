import { Router } from 'express';
import { getPoliticsByIso3 } from '../controllers/politics.controller';

const router = Router();

// Get politics data (WGI indicators + heads of government) for a specific country by ISO3
router.get('/:iso3', getPoliticsByIso3);

export default router;
