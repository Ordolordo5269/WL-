import { Router } from 'express';
import { getHistoryLayerController } from '../controllers/history.controller';

const router = Router();

// GET /api/history?year=YYYY[&lod=low|med|high][&limit=...]
router.get('/', getHistoryLayerController);

export default router;






















