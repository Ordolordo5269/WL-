import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { insightRequestSchema } from '../modules/insights/schemas.js';
import { authenticate } from '../modules/auth/middleware';
import * as ctrl from '../modules/insights/controller.js';

const router = Router();

router.post('/', authenticate, validate({ body: insightRequestSchema }), ctrl.create);

export default router;
