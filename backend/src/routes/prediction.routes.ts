import { Router } from 'express';
import { getPrediction, getInsights } from '../controllers/prediction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/prediction/:slug/:iso3?years=5
router.get('/:slug/:iso3', authenticate, getPrediction);

// POST /api/prediction/insights
router.post('/insights', authenticate, getInsights);

export default router;




