import { Router } from 'express';
import { getColorForCoef, projectOnAxis, projectAndColor, batchColors, getDataset, getOverlay } from '../controllers/alignment.controller';

const router = Router();

router.get('/color', getColorForCoef);
router.post('/project', projectOnAxis);
router.post('/project-color', projectAndColor);
router.post('/colors', batchColors);
router.get('/dataset', getDataset);
router.get('/overlay', getOverlay);

export default router;

