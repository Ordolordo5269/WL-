/**
 * Real-time lightning strikes from Blitzortung.org community network.
 * Uses WebSocket connection to receive live strike data globally.
 * Free, no API key, global coverage.
 *
 * Stores the last 5 minutes of strikes in memory.
 * The REST endpoint returns all stored strikes as GeoJSON.
 */
import WebSocket from 'ws';
import { logger } from '../../config/logger.js';
import type { FeatureCollection, GeoJsonFeature } from './types.js';

interface LightningStrike {
  lat: number;
  lng: number;
  time: number; // ms timestamp
}

// Store recent strikes (last 5 minutes)
const strikes: LightningStrike[] = [];
const MAX_AGE_MS = 5 * 60 * 1000;
const MAX_STRIKES = 5000; // Cap to prevent memory issues

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 2000;

function evictStale(): void {
  const cutoff = Date.now() - MAX_AGE_MS;
  while (strikes.length > 0 && strikes[0].time < cutoff) {
    strikes.shift();
  }
}

/**
 * Parse Blitzortung's semi-compressed message format.
 * The data is mostly JSON but with some bytes encoded in a custom scheme.
 * We extract lat/lon using regex on the readable portions.
 */
function parseStrike(raw: Buffer): LightningStrike | null {
  try {
    const str = raw.toString('utf8');

    // Blitzortung uses a custom compression where multi-byte UTF-8 sequences
    // replace common JSON characters. We extract lat/lon by isolating the
    // substrings between known key boundaries: "lat"...lon...al
    const latIdx = str.indexOf('"lat');
    const lonIdx = str.indexOf('lon');
    if (latIdx < 0 || lonIdx < 0) return null;

    const alIdx = str.indexOf('al', lonIdx + 3);
    const latStr = str.substring(latIdx, lonIdx);
    const lonStr = str.substring(lonIdx, alIdx > lonIdx ? alIdx : lonIdx + 30);

    const latMatch = latStr.match(/(-?\d+\.?\d*)/);
    const lonMatch = lonStr.match(/(-?\d+\.?\d*)/);
    if (!latMatch || !lonMatch) return null;

    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    if (isNaN(lat) || isNaN(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

    return { lat, lng: lon, time: Date.now() };
  } catch {
    return null;
  }
}

function connect(): void {
  try {
    ws = new WebSocket('wss://ws1.blitzortung.org/');

    ws.on('open', () => {
      logger.info('Blitzortung WebSocket connected');
      reconnectDelay = 2000;
      // Subscribe to global lightning data (area 111 = world)
      ws!.send(JSON.stringify({ a: 111 }));
    });

    ws.on('message', (data: WebSocket.Data) => {
      const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      const strike = parseStrike(buf);
      if (!strike) return;

      strikes.push(strike);

      // Log first few strikes for debugging
      if (strikes.length <= 3) {
        logger.info({ lat: strike.lat, lng: strike.lng }, 'Lightning strike received');
      }

      // Cap array size
      if (strikes.length > MAX_STRIKES) {
        strikes.splice(0, strikes.length - MAX_STRIKES);
      }
    });

    ws.on('close', () => {
      logger.warn('Blitzortung WebSocket closed — reconnecting...');
      scheduleReconnect();
    });

    ws.on('error', (err: Error) => {
      logger.error({ err }, 'Blitzortung WebSocket error');
      ws?.close();
    });
  } catch (err) {
    logger.error({ err }, 'Failed to connect to Blitzortung');
    scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 60000);
    connect();
  }, reconnectDelay);
}

export function startLightning(): void {
  connect();
  // Evict stale entries every 30 seconds
  setInterval(evictStale, 30 * 1000);
}

export function getLightning(): FeatureCollection {
  evictStale();

  const features: GeoJsonFeature[] = strikes.map((s) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
    properties: {
      time: s.time,
      type: 'lightning',
    },
  }));

  return { type: 'FeatureCollection', features };
}
