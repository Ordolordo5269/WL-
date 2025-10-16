import { Router } from 'express';
import axios from 'axios';
import { memoryCache } from '../core/cache/memoryCache';

const router = Router();

const GDELT_DOC_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const GDELT_GKG_URL = 'https://api.gdeltproject.org/api/v2/gkg/gkg';
const GDELT_GEO_URL = 'https://api.gdeltproject.org/api/v2/geo/geo';

const TTL_MS_DEFAULT = 5 * 60 * 1000; // 5 minutes

function sanitizeQuery(q: string): string {
  const trimmed = (q || '').trim();
  if (trimmed.length > 200) {
    return trimmed.slice(0, 200);
  }
  return trimmed;
}

function sanitizeTimespan(timespan: string | undefined): string {
  const allowed = new Set(['24h', '48h', '7d', '14d', '30d', '3m']);
  if (timespan && allowed.has(timespan)) return timespan;
  return '7d';
}

function sanitizeMaxRecords(maxrecords: string | undefined): number {
  const n = Number(maxrecords);
  if (Number.isFinite(n)) {
    return Math.max(1, Math.min(250, Math.floor(n)));
  }
  return 50;
}

function sanitizeMode(mode: string | undefined): 'timelinevol' | 'timelinevolnorm' {
  return mode === 'timelinevolnorm' ? 'timelinevolnorm' : 'timelinevol';
}

async function fetchWithCache<T>(cacheKey: string, url: string, params: Record<string, string | number>, ttlMs = TTL_MS_DEFAULT): Promise<T> {
  const cached = memoryCache.get<T>(cacheKey);
  if (cached) return cached;

  const axiosConfig = {
    params,
    timeout: 12000,
    headers: {
      'User-Agent': 'WL-Backend/1.0 (+http://localhost)',
      'Accept': 'application/json'
    },
    validateStatus: (status: number) => status >= 200 && status < 300
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await axios.get(url, axiosConfig);
      const data = res.data as T;
      memoryCache.set(cacheKey, data, ttlMs);
      return data;
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, attempt === 0 ? 300 : 0));
    }
  }
  throw lastError ?? new Error('Unknown error fetching GDELT');
}

router.get('/doc', async (req, res) => {
  const q = sanitizeQuery(String(req.query.q || ''));
  const timespan = sanitizeTimespan(String(req.query.timespan || ''));
  const maxrecords = sanitizeMaxRecords(String(req.query.maxrecords || ''));
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const params = {
    query: q,
    timespan,
    format: 'json',
    maxrecords,
    sort: 'datedesc'
  } as const;

  const cacheKey = `gdelt:doc:${JSON.stringify(params)}`;
  try {
    const data = await fetchWithCache<any>(cacheKey, GDELT_DOC_URL, params);
    res.json(data);
  } catch (err) {
    console.error('GDELT /doc error', err);
    res.status(502).json({ error: 'Upstream error' });
  }
});

router.get('/timeline', async (req, res) => {
  const q = sanitizeQuery(String(req.query.q || ''));
  const timespan = sanitizeTimespan(String(req.query.timespan || ''));
  const mode = sanitizeMode(String(req.query.mode || ''));
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const params = {
    query: q,
    timespan,
    format: 'json',
    mode
  } as const;

  const cacheKey = `gdelt:timeline:${JSON.stringify(params)}`;
  try {
    const data = await fetchWithCache<any>(cacheKey, GDELT_DOC_URL, params);
    res.json(data);
  } catch (err) {
    console.error('GDELT /timeline error', err);
    res.status(502).json({ error: 'Upstream error' });
  }
});

router.get('/gkg', async (req, res) => {
  const q = sanitizeQuery(String(req.query.q || ''));
  const timespan = sanitizeTimespan(String(req.query.timespan || ''));
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const params = {
    query: q,
    timespan,
    format: 'json'
  } as const;

  const cacheKey = `gdelt:gkg:${JSON.stringify(params)}`;
  try {
    const data = await fetchWithCache<any>(cacheKey, GDELT_GKG_URL, params);
    res.json(data);
  } catch (err) {
    console.error('GDELT /gkg error', err);
    // Graceful degradation: return empty GKG payload to avoid breaking the UI
    res.json({ gkg: [], degraded: true });
  }
});

router.get('/geo', async (req, res) => {
  const q = sanitizeQuery(String(req.query.q || ''));
  const timespan = sanitizeTimespan(String(req.query.timespan || ''));
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const params = {
    query: q,
    timespan,
    format: 'geojson'
  } as const;

  const cacheKey = `gdelt:geo:${JSON.stringify(params)}`;
  try {
    const data = await fetchWithCache<any>(cacheKey, GDELT_GEO_URL, params);
    res.json(data);
  } catch (err) {
    console.error('GDELT /geo error', err);
    res.status(502).json({ error: 'Upstream error' });
  }
});

export default router;


