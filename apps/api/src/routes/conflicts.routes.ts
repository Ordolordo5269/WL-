import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { conflictFiltersSchema, conflictParamsSchema } from '../modules/conflicts/schemas.js';
import * as ctrl from '../modules/conflicts/controller.js';

const router = Router();

router.get('/', validate({ query: conflictFiltersSchema }), ctrl.list);
router.get('/:slug', validate({ params: conflictParamsSchema }), ctrl.getBySlug);

export default router;
