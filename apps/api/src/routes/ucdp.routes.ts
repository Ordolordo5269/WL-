import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  ucdpEventFiltersSchema,
  ucdpConflictFiltersSchema,
  ucdpBattleDeathsFiltersSchema,
  ucdpNonStateFiltersSchema,
  ucdpOneSidedFiltersSchema,
  ucdpEventParamsSchema,
  ucdpConflictParamsSchema,
  ucdpSyncBodySchema,
} from '../modules/ucdp/schemas.js';
import * as ctrl from '../modules/ucdp/controller.js';

const router = Router();

// GED Events - list with filters
router.get('/', validate({ query: ucdpEventFiltersSchema }), ctrl.listEvents);

// GED Events - GeoJSON for map
router.get('/geojson', validate({ query: ucdpEventFiltersSchema }), ctrl.getEventsGeoJson);

// Stats
router.get('/stats', ctrl.getStats);

// Sync status & trigger
router.get('/sync/status', ctrl.getSyncStatus);
router.post('/sync', validate({ body: ucdpSyncBodySchema }), ctrl.triggerSync);

// Conflicts
router.get('/conflicts', validate({ query: ucdpConflictFiltersSchema }), ctrl.listConflicts);
router.get('/conflicts/active', ctrl.getActiveConflicts);
router.get('/conflicts/:conflictId', validate({ params: ucdpConflictParamsSchema }), ctrl.getConflictDetail);

// Battle Deaths
router.get('/battledeaths', validate({ query: ucdpBattleDeathsFiltersSchema }), ctrl.listBattleDeaths);

// Non-State
router.get('/nonstate', validate({ query: ucdpNonStateFiltersSchema }), ctrl.listNonState);

// One-Sided
router.get('/onesided', validate({ query: ucdpOneSidedFiltersSchema }), ctrl.listOneSided);

// Single GED Event by ID — MUST be LAST to avoid capturing other routes
router.get('/:id', validate({ params: ucdpEventParamsSchema }), ctrl.getEventById);

export default router;
