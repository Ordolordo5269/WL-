import { MemoryCache } from './cache.js';
import { logger } from '../../config/logger.js';

const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';

interface RadarData {
  tileUrl: string;
  timestamp: number;
}

const cache = new MemoryCache<RadarData>(5 * 60 * 1000); // 5 min

export async function getRadar(): Promise<RadarData> {
  const cached = cache.get();
  if (cached) return cached;

  try {
    const res = await fetch(RAINVIEWER_URL);
    if (!res.ok) throw new Error(`RainViewer API error: ${res.status}`);

    const data = await res.json();

    // Get the most recent radar frame
    const radarFrames = data?.radar?.past ?? [];
    const latest = radarFrames[radarFrames.length - 1];

    if (!latest) throw new Error('No radar frames available');

    const result: RadarData = {
      tileUrl: `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`,
      timestamp: latest.time,
    };

    cache.set(result);
    logger.info(`Fetched radar tile URL from RainViewer (ts: ${result.timestamp})`);
    return result;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch radar data');
    return cache.get() ?? { tileUrl: '', timestamp: 0 };
  }
}
