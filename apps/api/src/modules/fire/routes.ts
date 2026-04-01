import { Router } from 'express';
import { getFireTile } from './controller';

const router = Router();

// GET /api/fire/tile?bbox=...  — proxy FIRMS WMS tile with server-side cache
router.get('/tile', getFireTile);

export default router;
