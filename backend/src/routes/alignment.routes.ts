import { Router } from 'express';
import { getColorForCoef, projectOnAxis } from '../controllers/alignment.controller';

const router = Router();

router.get('/color', getColorForCoef);
router.post('/project', projectOnAxis);

export default router;

