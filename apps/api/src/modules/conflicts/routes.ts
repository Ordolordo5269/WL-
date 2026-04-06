import { Router } from 'express';
import * as ctrl from './controller';

const router = Router();

// Factions (specific routes before parameterized to avoid /:id matching "factions")
router.get('/factions/all', ctrl.listFactions);
router.get('/factions/:id/profile', ctrl.getFactionProfile);
router.get('/factions/:id/conflicts', ctrl.getFactionConflicts);

// Conflicts
router.get('/', ctrl.listConflicts);
router.get('/:id', ctrl.getConflict);
router.get('/:id/factions', ctrl.getConflictFactions);
router.get('/:id/support-links', ctrl.getConflictSupportLinks);

export default router;
