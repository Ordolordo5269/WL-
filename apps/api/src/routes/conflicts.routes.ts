import { Router } from 'express';
import { getConflictEvents } from '../services/conflicts/acled-client.js';

const router = Router();

router.get('/events', async (_req, res, next) => {
  try {
    const data = await getConflictEvents();
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
