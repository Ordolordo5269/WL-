import { MemoryCache } from './cache.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import type { FeatureCollection, GeoJsonFeature } from './types.js';

const cache = new MemoryCache<FeatureCollection>(15 * 60 * 1000); // 15 min

function getFirmsUrl(): string {
  const key = env.NASA_FIRMS_KEY;
  if (!key) throw new Error('NASA_FIRMS_KEY not configured');
  return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/world/1`;
}

function parseCsv(csv: string): FeatureCollection {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return { type: 'FeatureCollection', features: [] };

  const headers = lines[0].split(',');
  const latIdx = headers.indexOf('latitude');
  const lngIdx = headers.indexOf('longitude');
  const brightIdx = headers.indexOf('bright_ti4');
  const confIdx = headers.indexOf('confidence');
  const dateIdx = headers.indexOf('acq_date');
  const timeIdx = headers.indexOf('acq_time');

  const features: GeoJsonFeature[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const confidence = cols[confIdx];

    // Filter low-confidence detections to reduce volume
    if (confidence === 'low' || confidence === 'l') continue;

    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    if (isNaN(lat) || isNaN(lng)) continue;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        brightness: parseFloat(cols[brightIdx]) || 0,
        confidence,
        acq_date: cols[dateIdx],
        acq_time: cols[timeIdx],
        type: 'fire',
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export async function getFires(): Promise<FeatureCollection> {
  const cached = cache.get();
  if (cached) return cached;

  try {
    const res = await fetch(getFirmsUrl());
    if (!res.ok) throw new Error(`NASA FIRMS API error: ${res.status}`);

    const csv = await res.text();
    const fc = parseCsv(csv);

    cache.set(fc);
    logger.info(`Fetched ${fc.features.length} fire detections from NASA FIRMS`);
    return fc;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch fires');
    return cache.get() ?? { type: 'FeatureCollection', features: [] };
  }
}
