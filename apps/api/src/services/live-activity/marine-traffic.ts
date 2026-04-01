import WebSocket from 'ws';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import type { FeatureCollection, GeoJsonFeature } from './types.js';

interface VesselPosition {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  name: string;
  timestamp: number;
}

// In-memory store of recent vessel positions keyed by MMSI
const vessels = new Map<string, VesselPosition>();

// Evict entries older than 5 minutes
const EVICT_MS = 5 * 60 * 1000;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 2000;

function evictStale(): void {
  const cutoff = Date.now() - EVICT_MS;
  for (const [mmsi, v] of vessels) {
    if (v.timestamp < cutoff) vessels.delete(mmsi);
  }
}

function connect(): void {
  const key = env.AISSTREAM_KEY;
  if (!key) {
    logger.warn('AISSTREAM_KEY not configured — marine traffic disabled');
    return;
  }

  try {
    ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

    ws.on('open', () => {
      logger.info('AISStream WebSocket connected');
      reconnectDelay = 2000; // reset backoff

      ws!.send(
        JSON.stringify({
          APIKey: key,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FilterMessageTypes: ['PositionReport'],
        }),
      );
    });

    ws.on('message', (raw: WebSocket.Data) => {
      try {
        const msg = JSON.parse(raw.toString());
        const report = msg?.Message?.PositionReport;
        const meta = msg?.MetaData;

        if (!report || !meta) return;

        const mmsi = String(meta.MMSI ?? '');
        if (!mmsi) return;

        vessels.set(mmsi, {
          lat: report.Latitude,
          lng: report.Longitude,
          heading: report.TrueHeading ?? report.Cog ?? 0,
          speed: report.Sog ?? 0,
          name: (meta.ShipName ?? '').trim(),
          timestamp: Date.now(),
        });
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      logger.warn('AISStream WebSocket closed — reconnecting...');
      scheduleReconnect();
    });

    ws.on('error', (err) => {
      logger.error({ err }, 'AISStream WebSocket error');
      ws?.close();
    });
  } catch (err) {
    logger.error({ err }, 'Failed to connect to AISStream');
    scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 60000); // exponential backoff, max 60s
    connect();
  }, reconnectDelay);
}

export function startMarineTraffic(): void {
  connect();
  // Evict stale entries every minute
  setInterval(evictStale, 60 * 1000);
}

export function getMarineTraffic(): FeatureCollection {
  evictStale();

  const features: GeoJsonFeature[] = [];
  for (const [mmsi, v] of vessels) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: {
        mmsi,
        name: v.name,
        heading: v.heading,
        speed: v.speed,
        type: 'vessel',
      },
    });
  }

  return { type: 'FeatureCollection', features };
}
