import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  conflictFiltersSchema,
  conflictParamsSchema,
  getConflictsSchema,
  getConflictByIdSchema,
  getConflictBySlugSchema,
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

// V2 endpoints (list with OSINT enrichment)
router.get('/v2', validate({ query: conflictFiltersSchema }), ctrl.list);
router.get('/v2/:slug', validate({ params: conflictParamsSchema }), ctrl.getBySlug);

// Legacy CRUD endpoints (now unified under /api/conflicts)
router.get('/stats', ctrl.getConflictStats);
router.get('/search', validate(searchConflictsSchema), ctrl.searchConflictsController);
router.get('/slug/:slug', validate(getConflictBySlugSchema), ctrl.getConflictBySlug);
router.get('/:id', validate(getConflictByIdSchema), ctrl.getConflictById);
router.get('/', validate(getConflictsSchema), ctrl.getAllConflicts);

router.post('/', validate(createConflictSchema), ctrl.createConflict);
router.put('/:id', validate(updateConflictSchema), ctrl.updateConflict);
router.delete('/:id', validate(deleteConflictSchema), ctrl.deleteConflict);

// News endpoints
router.get('/:id/news', validate(getConflictNewsSchema), ctrl.getConflictNews);
router.post('/:id/news', validate(cacheConflictNewsSchema), ctrl.cacheConflictNews);
router.delete('/:id/news/:newsId', validate(deleteConflictNewsSchema), ctrl.deleteConflictNews);

export default router;
