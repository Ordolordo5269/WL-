import { MemoryCache } from './cache.js';
import { logger } from '../../config/logger.js';
import type { FeatureCollection } from './types.js';

const USGS_URL =
  'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=500&orderby=time';

const cache = new MemoryCache<FeatureCollection>(5 * 60 * 1000); // 5 min

export async function getEarthquakes(): Promise<FeatureCollection> {
  const cached = cache.get();
  if (cached) return cached;

  try {
    const res = await fetch(USGS_URL);
    if (!res.ok) throw new Error(`USGS API error: ${res.status}`);

    const data = await res.json();

    // USGS already returns GeoJSON FeatureCollection — trim to relevant props
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: (data.features ?? []).map((f: any) => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          mag: f.properties.mag,
          place: f.properties.place,
          time: f.properties.time,
          depth: f.geometry?.coordinates?.[2] ?? 0,
          type: 'earthquake',
        },
      })),
    };

    cache.set(fc);
    logger.info(`Fetched ${fc.features.length} earthquakes from USGS`);
    return fc;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch earthquakes');
    return cache.get() ?? { type: 'FeatureCollection', features: [] };
  }
}
