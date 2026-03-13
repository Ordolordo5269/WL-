import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  conflictListFiltersSchema,
  slugParamSchema,
  eventFiltersSchema,
  timelineParamsSchema,
  searchSchema,
} from '../modules/conflicts/schemas.js';
import * as ctrl from '../modules/conflicts/controller.js';

const router = Router();

// Global
router.get('/stats', ctrl.getStats);
router.get('/search', validate({ query: searchSchema }), ctrl.search);
router.get('/', validate({ query: conflictListFiltersSchema }), ctrl.list);

// Per-conflict
router.get('/:slug', validate({ params: slugParamSchema }), ctrl.getBySlug);
router.get('/:slug/events', validate({ params: slugParamSchema, query: eventFiltersSchema }), ctrl.getEvents);
router.get('/:slug/heatmap', validate({ params: slugParamSchema }), ctrl.getHeatmap);
router.get('/:slug/timeline', validate({ params: slugParamSchema, query: timelineParamsSchema }), ctrl.getTimeline);

// Sync (admin)
router.post('/sync', ctrl.syncAll);
router.post('/:slug/sync', validate({ params: slugParamSchema }), ctrl.syncOne);

export default router;
