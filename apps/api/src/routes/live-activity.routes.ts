import { Router } from 'express';
import { getEarthquakes } from '../services/live-activity/earthquakes.js';
import { getFires } from '../services/live-activity/fires.js';
import { getRadar } from '../services/live-activity/radar.js';
import { getAirTraffic } from '../services/live-activity/air-traffic.js';
import { getMarineTraffic } from '../services/live-activity/marine-traffic.js';
import { getSatellites, getSatelliteOrbit } from '../services/live-activity/satellites.js';

const router = Router();

router.get('/earthquakes', async (_req, res, next) => {
  try {
    const data = await getEarthquakes();
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/fires', async (_req, res, next) => {
  try {
    const data = await getFires();
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/radar', async (_req, res, next) => {
  try {
    const data = await getRadar();
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/air-traffic', async (_req, res, next) => {
  try {
    const data = await getAirTraffic();
    res.setHeader('Cache-Control', 'public, max-age=10');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/marine-traffic', (_req, res) => {
  const data = getMarineTraffic();
  res.setHeader('Cache-Control', 'public, max-age=10');
  res.json(data);
});

router.get('/satellites', async (_req, res, next) => {
  try {
    const data = await getSatellites();
    res.setHeader('Cache-Control', 'public, max-age=20');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/satellites/:noradId/orbit', async (req, res, next) => {
  try {
    const noradId = parseInt(req.params.noradId, 10);
    if (isNaN(noradId)) { res.status(400).json({ error: 'Invalid NORAD ID' }); return; }
    const data = await getSatelliteOrbit(noradId);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
