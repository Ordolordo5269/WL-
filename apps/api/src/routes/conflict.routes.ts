import { Router } from 'express';
import {
  getAllConflictsController,
  getConflictByIdController,
  getConflictBySlugController,
  createConflictController,
  updateConflictController,
  deleteConflictController,
  getConflictStatsController,
  searchConflictsController,
  getConflictNewsController,
  cacheConflictNewsController,
  deleteConflictNewsController
} from '../controllers/conflict.controller';
import { validate } from '../core/validation/validate';
import {
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
} from '../core/validation/schemas/conflict.schemas';

const router = Router();

// GET /api/conflicts - List all conflicts (with optional filters)
router.get('/', validate(getConflictsSchema), getAllConflictsController);

// GET /api/conflicts/stats - Get conflict statistics
router.get('/stats', getConflictStatsController);

// GET /api/conflicts/search?q=... - Search conflicts
router.get('/search', validate(searchConflictsSchema), searchConflictsController);

// GET /api/conflicts/slug/:slug - Get conflict by slug
router.get('/slug/:slug', validate(getConflictBySlugSchema), getConflictBySlugController);

// GET /api/conflicts/:id - Get conflict by ID
router.get('/:id', validate(getConflictByIdSchema), getConflictByIdController);

// POST /api/conflicts - Create new conflict (admin)
router.post('/', validate(createConflictSchema), createConflictController);

// PUT /api/conflicts/:id - Update conflict (admin)
router.put('/:id', validate(updateConflictSchema), updateConflictController);

// DELETE /api/conflicts/:id - Delete conflict (admin)
router.delete('/:id', validate(deleteConflictSchema), deleteConflictController);

// News endpoints

// GET /api/conflicts/:id/news - Get cached news for conflict
router.get('/:id/news', validate(getConflictNewsSchema), getConflictNewsController);

// POST /api/conflicts/:id/news - Cache news article
router.post('/:id/news', validate(cacheConflictNewsSchema), cacheConflictNewsController);

// DELETE /api/conflicts/:id/news/:newsId - Delete cached news
router.delete('/:id/news/:newsId', validate(deleteConflictNewsSchema), deleteConflictNewsController);

export default router;

