import { Router, type Request, type Response } from 'express';
import { getCandidateProfile, getHeatmapPoints } from './candidate.service.js';
import { logger } from '../../config/logger.js';

const router = Router();

/**
 * GET /api/ucdp/geo
 * Heatmap points from UCDP Candidate Events v26.0.2 (adm_1 level, in-memory)
 */
router.get('/geo', (_req: Request, res: Response) => {
  try {
    const points = getHeatmapPoints();
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
    res.json(points);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch UCDP geo points');
    res.status(500).json({ error: 'Failed to fetch geo points' });
  }
});

/**
 * GET /api/ucdp/profile/:country
 * Violence profile + factions + hotspots for a country (from candidates)
 */
router.get('/profile/:country', (req: Request, res: Response) => {
  try {
    const profile = getCandidateProfile(req.params.country);
    if (!profile) {
      res.status(404).json({ error: 'No 2026 candidate data for this country' });
      return;
    }
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
    res.json(profile);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch UCDP profile');
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
