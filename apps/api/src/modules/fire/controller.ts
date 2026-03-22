import type { Request, Response } from 'express';
import axios from 'axios';

// ─── In-memory tile cache ────────────────────────────────────────────
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ENTRIES = 500;

interface CachedTile {
  data: Buffer;
  contentType: string;
  expiresAt: number;
}

const tileCache = new Map<string, CachedTile>();

function evictExpired() {
  const now = Date.now();
  for (const [key, entry] of tileCache) {
    if (entry.expiresAt < now) tileCache.delete(key);
  }
}

// ─── FIRMS config ────────────────────────────────────────────────────
const FIRMS_KEY = process.env.FIRMS_MAP_KEY || '';
const FIRMS_BASE = FIRMS_KEY
  ? `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${FIRMS_KEY}/`
  : 'https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/';

// ─── Controller ──────────────────────────────────────────────────────
export async function getFireTile(req: Request, res: Response) {
  const bbox = req.query.bbox as string | undefined;
  const width = req.query.width as string || '256';
  const height = req.query.height as string || '256';

  if (!bbox) {
    res.status(400).json({ error: 'bbox query parameter is required' });
    return;
  }

  const cacheKey = `${bbox}:${width}:${height}`;

  // Check cache
  const cached = tileCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.set('Content-Type', cached.contentType);
    res.set('Cache-Control', 'public, max-age=900, stale-while-revalidate=1800');
    res.set('X-Cache', 'HIT');
    res.send(cached.data);
    return;
  }

  // Fetch from FIRMS
  const url = `${FIRMS_BASE}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=fires_viirs_24&STYLES=&SRS=EPSG:3857&BBOX=${bbox}&WIDTH=${width}&HEIGHT=${height}&FORMAT=image/png&TRANSPARENT=true`;

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10_000,
    });

    const data = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/png';

    // Evict expired entries if cache is getting large
    if (tileCache.size >= MAX_CACHE_ENTRIES) evictExpired();
    // If still too large after eviction, clear oldest half
    if (tileCache.size >= MAX_CACHE_ENTRIES) {
      const keys = [...tileCache.keys()];
      keys.slice(0, Math.floor(keys.length / 2)).forEach(k => tileCache.delete(k));
    }

    tileCache.set(cacheKey, { data, contentType, expiresAt: Date.now() + CACHE_TTL_MS });

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=900, stale-while-revalidate=1800');
    res.set('X-Cache', 'MISS');
    res.send(data);
  } catch (err: any) {
    console.error('[fire/tile] FIRMS proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch fire tile from FIRMS' });
  }
}
