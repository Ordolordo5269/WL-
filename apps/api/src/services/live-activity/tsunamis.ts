/**
 * Tsunami alerts from NOAA Pacific Tsunami Warning Center.
 * Uses the NOAA Tsunami Events API — free, no API key, global coverage.
 * Cache: 5 minutes.
 */
import { MemoryCache } from './cache.js';
import { logger } from '../../config/logger.js';
import type { FeatureCollection, GeoJsonFeature } from './types.js';

// NOAA PTWC GeoJSON feed for recent tsunami events
const NOAA_TSUNAMI_URL = 'https://www.tsunami.gov/events/xml/PAAQAtom.xml';
// NOAA NGDC historical + recent significant earthquakes/tsunamis
const NOAA_EVENTS_URL = `https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/tsunamis/events?minYear=${new Date().getFullYear() - 2}&maxYear=${new Date().getFullYear() + 1}`;

const cache = new MemoryCache<FeatureCollection>(5 * 60 * 1000); // 5 min

export async function getTsunamis(): Promise<FeatureCollection> {
  const cached = cache.get();
  if (cached) return cached;

  try {
    const res = await fetch(NOAA_EVENTS_URL, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`NOAA Tsunami API error: ${res.status}`);

    const data = await res.json();
    const items = data.items ?? data ?? [];
    const features: GeoJsonFeature[] = [];

    for (const item of (Array.isArray(items) ? items : [])) {
      const lat = item.latitude ?? item.lat;
      const lng = item.longitude ?? item.lng;
      if (lat == null || lng == null) continue;

      const year = item.year ?? new Date().getFullYear();
      const month = item.month ?? 1;
      const day = item.day ?? 1;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          cause: item.causeCode || item.cause || 'Earthquake',
          country: item.country || item.locationName || '',
          max_height: item.maxWaterHeight ?? item.maximumWaterHeight ?? 0,
          magnitude: item.eqMagnitude ?? item.magnitude ?? 0,
          deaths: item.deaths ?? item.numDeaths ?? 0,
          date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          year,
          intensity: item.tsunamiIntensity ?? item.intensity ?? 0,
          type: 'tsunami',
        },
      });
    }

    const fc: FeatureCollection = { type: 'FeatureCollection', features };
    cache.set(fc);
    logger.info(`Fetched ${features.length} tsunami events from NOAA`);
    return fc;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch tsunamis');
    return cache.get() ?? { type: 'FeatureCollection', features: [] };
  }
}
