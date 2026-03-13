import { MemoryCache } from './cache.js';
import { logger } from '../../config/logger.js';
import type { FeatureCollection, GeoJsonFeature } from './types.js';

// Satellite groups with category labels for classification
const CELESTRAK_GROUPS: { group: string; category: string }[] = [
  { group: 'stations',    category: 'Station' },
  { group: 'starlink',    category: 'Starlink' },
  { group: 'oneweb',      category: 'OneWeb' },
  { group: 'gps-ops',     category: 'Navigation' },
  { group: 'glo-ops',     category: 'Navigation' },
  { group: 'galileo',     category: 'Navigation' },
  { group: 'beidou',      category: 'Navigation' },
  { group: 'weather',     category: 'Weather' },
  { group: 'noaa',        category: 'Weather' },
  { group: 'resource',    category: 'Earth Observation' },
  { group: 'science',     category: 'Science' },
  { group: 'geo',         category: 'Communication' },
  { group: 'iridium',     category: 'Communication' },
  { group: 'iridium-NEXT', category: 'Communication' },
  { group: 'ses',         category: 'Communication' },
  { group: 'military',    category: 'Military' },
];

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';

// Map to store category per NORAD ID
const categoryMap = new Map<number, string>();

// Cache TLE data for 1 hour (orbital elements don't change often)
const tleCache = new MemoryCache<any[]>(60 * 60 * 1000);
// Cache computed positions for 30 seconds
const posCache = new MemoryCache<FeatureCollection>(30 * 1000);
// Cache individual TLE lookups for orbit computation
const tleLookupCache = new Map<number, any>();

// Simplified SGP4-like propagation using orbital elements
function propagatePositionAtTime(tle: any, timeMs: number): { lat: number; lng: number; alt: number } | null {
  try {
    const inclination = tle.INCLINATION ?? 0;
    const raan = tle.RA_OF_ASC_NODE ?? 0;
    const meanMotion = tle.MEAN_MOTION ?? 15.5; // rev/day
    const meanAnomaly = tle.MEAN_ANOMALY ?? 0;
    const eccentricity = tle.ECCENTRICITY ?? 0;
    const epoch = tle.EPOCH ? new Date(tle.EPOCH).getTime() : Date.now();

    const elapsedDays = (timeMs - epoch) / 86400000;

    // Current mean anomaly (degrees)
    const M = (meanAnomaly + 360 * meanMotion * elapsedDays) % 360;
    const MRad = (M * Math.PI) / 180;

    // Simple Kepler equation for true anomaly (1st order)
    const E = MRad + eccentricity * Math.sin(MRad);
    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(E / 2),
    );

    // Argument of latitude
    const argLat = trueAnomaly + ((tle.ARG_OF_PERICENTER ?? 0) * Math.PI) / 180;

    // Inclination and RAAN in radians
    const iRad = (inclination * Math.PI) / 180;
    const raanRad = (raan * Math.PI) / 180;

    // Earth's rotation since epoch
    const gmst = (280.46061837 + 360.98564736629 * (timeMs / 86400000 - 10957.5)) % 360;
    const gmstRad = (gmst * Math.PI) / 180;

    // Position in Earth-centered frame
    const lat = Math.asin(Math.sin(iRad) * Math.sin(argLat)) * (180 / Math.PI);
    const lng =
      ((Math.atan2(
        Math.cos(iRad) * Math.sin(argLat),
        Math.cos(argLat),
      ) + raanRad - gmstRad) * 180) / Math.PI;

    // Semi-major axis from mean motion (km)
    const a = Math.pow(398600.4418 / Math.pow((meanMotion * 2 * Math.PI) / 86400, 2), 1 / 3);
    const alt = a - 6371; // altitude above Earth's surface

    // Normalize longitude to [-180, 180]
    const normLng = ((lng + 540) % 360) - 180;

    if (isNaN(lat) || isNaN(normLng)) return null;
    return { lat, lng: normLng, alt };
  } catch {
    return null;
  }
}

function propagatePosition(tle: any): { lat: number; lng: number; alt: number } | null {
  return propagatePositionAtTime(tle, Date.now());
}

async function fetchTLE(): Promise<any[]> {
  const cached = tleCache.get();
  if (cached) return cached;

  const allTles: any[] = [];
  const seen = new Set<number>();

  for (const { group, category } of CELESTRAK_GROUPS) {
    try {
      const url = `${CELESTRAK_BASE}?GROUP=${group}&FORMAT=json`;
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn(`CelesTrak ${group} returned ${res.status}`);
        continue;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const tle of data) {
          const id = tle.NORAD_CAT_ID;
          if (id && !seen.has(id)) {
            seen.add(id);
            allTles.push(tle);
            tleLookupCache.set(id, tle);
            categoryMap.set(id, category);
          }
        }
      }
    } catch (err) {
      logger.warn({ err }, `Failed to fetch CelesTrak group: ${group}`);
    }
  }

  if (allTles.length === 0) throw new Error('No TLE data fetched from any group');
  tleCache.set(allTles);
  logger.info(`Fetched TLE data for ${allTles.length} satellites from ${CELESTRAK_GROUPS.length} groups`);
  return allTles;
}

export async function getSatellites(): Promise<FeatureCollection> {
  const cached = posCache.get();
  if (cached) return cached;

  try {
    const tles = await fetchTLE();

    const features: GeoJsonFeature[] = [];
    for (const tle of tles) {
      const pos = propagatePosition(tle);
      if (!pos) continue;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pos.lng, pos.lat] },
        properties: {
          name: tle.OBJECT_NAME ?? 'Unknown',
          norad_id: tle.NORAD_CAT_ID ?? 0,
          altitude: Math.round(pos.alt),
          inclination: tle.INCLINATION ?? 0,
          period: tle.PERIOD ?? (1440 / (tle.MEAN_MOTION ?? 15.5)),
          category: categoryMap.get(tle.NORAD_CAT_ID) ?? 'Other',
          type: 'satellite',
        },
      });
    }

    const fc: FeatureCollection = { type: 'FeatureCollection', features };
    posCache.set(fc);
    logger.info(`Computed positions for ${features.length} satellites`);
    return fc;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch satellites');
    return posCache.get() ?? { type: 'FeatureCollection', features: [] };
  }
}

/**
 * Compute the orbit path for a satellite over one full orbital period.
 * Returns a GeoJSON LineString split into segments to handle antimeridian crossings.
 */
export async function getSatelliteOrbit(noradId: number): Promise<FeatureCollection> {
  // Ensure TLE data is loaded
  await fetchTLE();
  const tle = tleLookupCache.get(noradId);
  if (!tle) {
    return { type: 'FeatureCollection', features: [] };
  }

  const meanMotion = tle.MEAN_MOTION ?? 15.5;
  const periodMs = (86400000 / meanMotion); // one full orbit in ms
  const now = Date.now();
  const steps = 180; // points per orbit
  const dt = periodMs / steps;

  // Propagate positions over one full orbit
  const points: { lng: number; lat: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = now + (i - steps / 2) * dt; // center on current time
    const pos = propagatePositionAtTime(tle, t);
    if (pos) points.push({ lng: pos.lng, lat: pos.lat });
  }

  // Split into segments at antimeridian crossings (|dLng| > 180)
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    if (i > 0 && Math.abs(points[i].lng - points[i - 1].lng) > 180) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push([points[i].lng, points[i].lat]);
  }
  if (current.length > 1) segments.push(current);

  const features: GeoJsonFeature[] = segments.map(coords => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {
      name: tle.OBJECT_NAME ?? 'Unknown',
      norad_id: noradId,
    },
  }));

  return { type: 'FeatureCollection', features };
}
