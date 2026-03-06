import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { osintEventFiltersSchema, osintAlertFiltersSchema, osintEventParamsSchema } from '../modules/osint/schemas.js';
import * as ctrl from '../modules/osint/controller.js';

const router = Router();

router.get('/events', validate({ query: osintEventFiltersSchema }), ctrl.listEvents);
router.get('/events/:id', validate({ params: osintEventParamsSchema }), ctrl.getEvent);
router.get('/alerts', validate({ query: osintAlertFiltersSchema }), ctrl.listAlerts);
router.get('/sources', ctrl.sourcesHealth);

export default router;
