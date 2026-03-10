import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  conflictFiltersSchema,
  conflictParamsSchema,
  createConflictSchema,
  updateConflictSchema,
  deleteConflictSchema,
  searchConflictsSchema,
  getConflictNewsSchema,
  cacheConflictNewsSchema,
  deleteConflictNewsSchema
} from '../modules/conflicts/schemas.js';
import * as ctrl from '../modules/conflicts/controller.js';

const router = Router();

// Read endpoints (V2 handlers — return { data, count } format expected by frontend)
router.get('/stats', ctrl.getConflictStats);
router.get('/search', validate(searchConflictsSchema), ctrl.searchConflictsController);
router.get('/', validate({ query: conflictFiltersSchema }), ctrl.list);
router.get('/:slug', validate({ params: conflictParamsSchema }), ctrl.getBySlug);

router.post('/', validate(createConflictSchema), ctrl.createConflict);
router.put('/:id', validate(updateConflictSchema), ctrl.updateConflict);
router.delete('/:id', validate(deleteConflictSchema), ctrl.deleteConflict);

// News endpoints
router.get('/:id/news', validate(getConflictNewsSchema), ctrl.getConflictNews);
router.post('/:id/news', validate(cacheConflictNewsSchema), ctrl.cacheConflictNews);
router.delete('/:id/news/:newsId', validate(deleteConflictNewsSchema), ctrl.deleteConflictNews);

export default router;
