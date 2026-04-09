/**
 * GDACS (Global Disaster Alert and Coordination System) — real-time global disaster alerts.
 * Used by the United Nations for disaster coordination.
 * Free, no API key, global coverage.
 *
 * Event types: EQ (earthquakes), TC (tropical cyclones), FL (floods),
 *              VO (volcanoes), WF (wildfires), DR (droughts)
 * Alert levels: Green, Orange, Red
 *
 * Cache: 10 minutes.
 */
import { MemoryCache } from './cache.js';
import { logger } from '../../config/logger.js';
import type { FeatureCollection, GeoJsonFeature } from './types.js';

const GDACS_RSS_URL = 'https://www.gdacs.org/xml/rss.xml';

const cache = new MemoryCache<GeoJsonFeature[]>(10 * 60 * 1000); // 10 min

async function fetchAllAlerts(): Promise<GeoJsonFeature[]> {
  const cached = cache.get();
  if (cached) return cached;

  try {
    const res = await fetch(GDACS_RSS_URL);
    if (!res.ok) throw new Error(`GDACS RSS error: ${res.status}`);

    const xml = await res.text();
    const features = parseRss(xml);
    cache.set(features);
    logger.info(`Fetched ${features.length} GDACS alerts`);
    return features;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch GDACS alerts');
    return cache.get() ?? [];
  }
}

function parseRss(xml: string): GeoJsonFeature[] {
  const features: GeoJsonFeature[] = [];

  // Split by <item> tags
  const items = xml.split('<item>').slice(1); // skip header

  for (const item of items) {
    try {
      const lat = extractTag(item, 'geo:lat');
      const lon = extractTag(item, 'geo:long');
      if (!lat || !lon) continue;

      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (isNaN(latNum) || isNaN(lonNum)) continue;

      const title = extractTag(item, 'title') ?? '';
      const eventtype = extractTag(item, 'gdacs:eventtype') ?? '';
      const alertlevel = extractTag(item, 'gdacs:alertlevel') ?? 'Green';
      const severity = extractTag(item, 'gdacs:severity') ?? '';
      const country = extractTag(item, 'gdacs:country') ?? '';
      const eventid = extractTag(item, 'gdacs:eventid') ?? '';
      const fromdate = extractTag(item, 'gdacs:fromdate') ?? '';
      const population = extractTag(item, 'gdacs:population') ?? '';
      const iscurrent = extractTag(item, 'gdacs:iscurrent') ?? 'false';

      // Extract severity value from attribute: <gdacs:severity unit="M" value="5.6">
      const sevValueMatch = item.match(/gdacs:severity[^>]*value="([^"]+)"/);
      const severityValue = sevValueMatch ? parseFloat(sevValueMatch[1]) : 0;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lonNum, latNum] },
        properties: {
          name: title,
          eventtype,
          alertlevel,
          severity,
          severityValue,
          country,
          eventid,
          fromdate,
          population,
          iscurrent: iscurrent === 'true',
          type: eventtypeToType(eventtype),
        },
      });
    } catch {
      // Skip malformed items
    }
  }

  return features;
}

function extractTag(xml: string, tag: string): string | null {
  // Match <tag>content</tag> or <tag ...>content</tag>
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function eventtypeToType(et: string): string {
  switch (et) {
    case 'EQ': return 'earthquake';
    case 'TC': return 'cyclone';
    case 'FL': return 'flood';
    case 'VO': return 'volcano';
    case 'WF': return 'wildfire';
    case 'DR': return 'drought';
    default: return 'disaster';
  }
}

/** Get all GDACS alerts */
export async function getGdacsAlerts(): Promise<FeatureCollection> {
  const features = await fetchAllAlerts();
  return { type: 'FeatureCollection', features };
}

/** Get GDACS alerts filtered by event types */
export async function getGdacsAlertsByType(types: string[]): Promise<FeatureCollection> {
  const features = await fetchAllAlerts();
  const filtered = features.filter(f => types.includes(f.properties.eventtype));
  return { type: 'FeatureCollection', features: filtered };
}
