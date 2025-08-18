import { Router } from 'express';
import { getColorForCoef, projectOnAxis, projectAndColor, batchColors } from '../controllers/alignment.controller';

const router = Router();

router.get('/color', getColorForCoef);
router.post('/project', projectOnAxis);
router.post('/project-color', projectAndColor);
router.post('/colors', batchColors);

export default router;

