import { Router } from 'express';
import { getEarthquakes } from '../services/live-activity/earthquakes.js';
import { getFires } from '../services/live-activity/fires.js';
import { getTsunamis } from '../services/live-activity/tsunamis.js';
import { getLightning } from '../services/live-activity/lightning.js';
import { getGdacsAlerts, getGdacsAlertsByType } from '../services/live-activity/gdacs.js';

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

// Active volcanoes — GDACS real-time (type VO)
router.get('/active-volcanoes', async (_req, res, next) => {
  try {
    const data = await getGdacsAlertsByType(['VO']);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Recent tsunamis — NOAA historical data
router.get('/tsunamis', async (_req, res, next) => {
  try {
    const data = await getTsunamis();
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Severe weather — GDACS real-time (tropical cyclones only)
router.get('/storms', async (_req, res, next) => {
  try {
    const data = await getGdacsAlertsByType(['TC']);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/lightning', (_req, res) => {
  const data = getLightning();
  res.setHeader('Cache-Control', 'public, max-age=5');
  res.json(data);
});

// All GDACS alerts (all disaster types)
router.get('/gdacs', async (_req, res, next) => {
  try {
    const data = await getGdacsAlerts();
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
