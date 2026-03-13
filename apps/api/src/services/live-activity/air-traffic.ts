import { MemoryCache } from './cache.js';
import { logger } from '../../config/logger.js';
import type { FeatureCollection, GeoJsonFeature } from './types.js';

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

const cache = new MemoryCache<FeatureCollection>(15 * 1000); // 15 sec

export async function getAirTraffic(): Promise<FeatureCollection> {
  const cached = cache.get();
  if (cached) return cached;

  try {
    const res = await fetch(OPENSKY_URL);
    if (!res.ok) throw new Error(`OpenSky API error: ${res.status}`);

    const data = await res.json();
    const states: any[][] = data.states ?? [];

    // OpenSky state vector indices:
    // 0: icao24, 1: callsign, 2: origin_country, 5: longitude, 6: latitude,
    // 7: baro_altitude, 8: on_ground, 9: velocity, 10: true_track
    const features: GeoJsonFeature[] = [];

    for (const s of states) {
      const lng = s[5];
      const lat = s[6];
      const onGround = s[8];

      if (onGround || lng == null || lat == null) continue;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          callsign: (s[1] ?? '').trim(),
          origin_country: s[2],
          altitude: s[7] ?? 0,
          velocity: s[9] ?? 0,
          heading: s[10] ?? 0,
          type: 'aircraft',
        },
      });
    }

    const fc: FeatureCollection = { type: 'FeatureCollection', features };
    cache.set(fc);
    logger.info(`Fetched ${features.length} aircraft from OpenSky`);
    return fc;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch air traffic');
    return cache.get() ?? { type: 'FeatureCollection', features: [] };
  }
}
