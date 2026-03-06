import { Router } from 'express';
import { getNaturalLayerController, searchNaturalController } from '../controllers/natural.controller';

const router = Router();

// GET /api/natural/:type
// Params:
//   type: rivers | peaks | mountain-ranges
// Query:
//   lod=auto|low|med|high
//   bbox=minx,miny,maxx,maxy
//   region=...
//   classMin (rivers), minElevation (peaks), limit
router.get('/:type', getNaturalLayerController);

// GET /api/natural/search?q=...
router.get('/search/q', searchNaturalController);

export default router;












