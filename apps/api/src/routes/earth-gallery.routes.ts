import { Router, type Request, type Response } from 'express';
import { logger } from '../config/logger.js';

const router = Router();

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';

// ── In-memory cache for API responses ──
const geoCache = new Map<string, { data: GeoLocation; ts: number }>();
const aiCache = new Map<string, { data: Record<string, unknown>; ts: number }>();
const GEO_TTL = 7 * 24 * 60 * 60 * 1000;   // 7 days
const AI_TTL = 30 * 24 * 60 * 60 * 1000;    // 30 days
const MAX_CACHE = 500;

function cacheSet<T>(cache: Map<string, { data: T; ts: number }>, key: string, data: T) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

// ── Reverse geocoding via Nominatim ──

interface GeoLocation {
  name: string | null;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  city: string | null;
  region: string | null;
  displayName: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<GeoLocation> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = geoCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < GEO_TTL) return cached.data;

  try {
    const url = `${NOMINATIM_API}?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WorldLore/1.0 (earth-gallery)' },
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = await res.json() as {
      display_name?: string;
      name?: string;
      address?: {
        country?: string;
        country_code?: string;
        state?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        region?: string;
        suburb?: string;
        road?: string;
        body_of_water?: string;
        ocean?: string;
        sea?: string;
      };
    };
    const addr = data.address ?? {};
    const result: GeoLocation = {
      name: data.name || addr.body_of_water || addr.ocean || addr.sea || null,
      country: addr.country ?? null,
      countryCode: addr.country_code?.toUpperCase() ?? null,
      state: addr.state ?? addr.region ?? null,
      city: addr.city ?? addr.town ?? addr.village ?? null,
      region: addr.county ?? addr.suburb ?? null,
      displayName: data.display_name ?? `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    };
    cacheSet(geoCache, cacheKey, result);
    return result;
  } catch (err) {
    logger.warn({ err }, 'Reverse geocode failed');
    return {
      name: null, country: null, countryCode: null,
      state: null, city: null, region: null,
      displayName: `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    };
  }
}

// ── DeepSeek GEOINT analysis ──

const SYSTEM_PROMPT = `You are a geospatial intelligence (GEOINT) analyst. You receive coordinates, a reverse-geocoded location, and a NASA satellite image URL. Provide a concise OSINT analysis in this exact format:

LOCATION: [Specific place name — city/region/landmark. Use the geocoded data provided.]
TERRAIN: [terrain type — urban, rural, desert, forest, coastal, mountain, tundra, etc.]
FEATURES: [2-3 key geographic/infrastructure features — rivers, roads, ports, airfields, industrial zones, military installations, etc.]
ACTIVITY: [NOMINAL, ELEVATED, or NOTABLE — with brief reason based on known activity in the area]
WEATHER: [estimated cloud cover and visibility for the region/season]
STRATEGIC: [1-2 sentence assessment of strategic/geopolitical significance of this location]

Be specific. Reference real place names, known facilities, and geopolitical context. Use military/intelligence terminology. Do not add any headers or extra text outside this format.`;

const NIGHT_VISION_PROMPT = `You are a geospatial intelligence (GEOINT) analyst specializing in nighttime radiance analysis. You receive coordinates, a reverse-geocoded location, and a NASA VIIRS Day/Night Band radiance image URL. The image shows light emissions from human infrastructure. Bright areas indicate cities, industrial facilities, transportation corridors, offshore platforms, fishing fleets, or gas flaring.

Provide a concise OSINT analysis in this exact format:

LOCATION: [Specific place name — city/region/landmark. Use the geocoded data provided.]
URBANIZATION: [Dense urban / Suburban / Peri-urban / Rural / Uninhabited — based on expected light density for this location]
INFRASTRUCTURE: [2-3 key infrastructure features visible through lighting — power grids, highway networks, industrial complexes, ports, airports, oil/gas facilities]
ANOMALIES: [NONE, MINOR, or SIGNIFICANT — any unusual lighting patterns such as gas flaring, fishing fleet clusters, military activity, power outages, or unexplained bright spots]
LIGHT_POLLUTION: [Bortle class estimate 1-9 with description, e.g. "Bortle 7 — Suburban/urban transition"]
STRATEGIC: [1-2 sentence assessment of the infrastructure and activity significance at this location]

Be specific. Reference real place names, known facilities, and infrastructure networks. Use intelligence terminology. Do not add any headers or extra text outside this format.`;

const RECON_PROMPT = `You are a geospatial intelligence (GEOINT) analyst specializing in high-resolution satellite reconnaissance. You receive coordinates, a reverse-geocoded location, and a high-resolution satellite image URL showing sub-meter detail including individual buildings, roads, and infrastructure.

Provide a concise OSINT analysis in this exact format:

LOCATION: [Specific place name — city/region/landmark. Use the geocoded data provided.]
LAND_USE: [Classification — residential, commercial, industrial, agricultural, military, mixed-use, undeveloped, etc. with density estimate]
INFRASTRUCTURE: [2-3 key infrastructure features visible — buildings, road networks, bridges, railways, utilities, ports, airfields, industrial facilities]
ACCESS_POINTS: [Key transportation access — highways, major roads, rail lines, airports, ports, waterways serving this location]
STRATEGIC: [1-2 sentence assessment of the location's significance — economic, military, logistical, or geopolitical importance]

Be specific. Reference real place names, known facilities, and infrastructure details. Use military/intelligence terminology. Do not add any headers or extra text outside this format.`;

router.post('/analyze', async (req: Request, res: Response) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI analysis not configured' });
    return;
  }

  const { imageUrl, lat, lng, mode } = req.body;
  if (!imageUrl || lat === undefined || lng === undefined) {
    res.status(400).json({ error: 'imageUrl, lat, and lng are required' });
    return;
  }

  const isNightVision = mode === 'night-vision';
  const isRecon = mode === 'recon';

  // Check AI cache (keyed by rounded coordinates + mode)
  const aiKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)},${mode || 'default'}`;
  const aiCached = aiCache.get(aiKey);
  if (aiCached && Date.now() - aiCached.ts < AI_TTL) {
    res.json(aiCached.data);
    return;
  }

  try {
    // Step 1: Reverse geocode
    const geo = await reverseGeocode(lat, lng);

    // Step 2: Build context for DeepSeek
    const locationCtx = [
      geo.city && `City: ${geo.city}`,
      geo.state && `State/Province: ${geo.state}`,
      geo.region && `Region: ${geo.region}`,
      geo.country && `Country: ${geo.country} (${geo.countryCode})`,
      `Full: ${geo.displayName}`,
    ].filter(Boolean).join('\n');

    const systemPrompt = isRecon ? RECON_PROMPT : isNightVision ? NIGHT_VISION_PROMPT : SYSTEM_PROMPT;
    const userPrompt = isRecon
      ? `Analyze this high-resolution satellite reconnaissance target:\n\nCoordinates: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°\n\nReverse Geocoded Location:\n${locationCtx}\n\nHigh-Resolution Satellite Image: ${imageUrl}\n\nProvide your reconnaissance analysis focusing on infrastructure, land use, and strategic assessment using real-world knowledge of this specific location.`
      : isNightVision
      ? `Analyze this nighttime radiance observation point:\n\nCoordinates: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°\n\nReverse Geocoded Location:\n${locationCtx}\n\nVIIRS Day/Night Band Image: ${imageUrl}\n\nProvide your night radiance GEOINT analysis using real-world knowledge of infrastructure and activity at this specific location.`
      : `Analyze this observation point:\n\nCoordinates: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°\n\nReverse Geocoded Location:\n${locationCtx}\n\nSatellite Image: ${imageUrl}\n\nProvide your GEOINT analysis using real-world knowledge of this specific location.`;

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ status: response.status, err }, 'DeepSeek API error');
      res.status(502).json({ error: 'AI service error' });
      return;
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content ?? '';

    // Parse structured response
    const lines = content.split('\n').filter((l: string) => l.trim());
    const parsed: Record<string, string> = {};
    const parseKeys = isRecon
      ? 'LOCATION|LAND_USE|INFRASTRUCTURE|ACCESS_POINTS|STRATEGIC'
      : isNightVision
      ? 'LOCATION|URBANIZATION|INFRASTRUCTURE|ANOMALIES|LIGHT_POLLUTION|STRATEGIC'
      : 'LOCATION|TERRAIN|FEATURES|ACTIVITY|WEATHER|STRATEGIC';
    const parseRegex = new RegExp(`^(${parseKeys}):\\s*(.+)`, 'i');
    for (const line of lines) {
      const match = line.match(parseRegex);
      if (match) parsed[match[1].toUpperCase()] = match[2].trim();
    }

    let result: Record<string, unknown>;
    if (isRecon) {
      result = {
        raw: content, geo,
        location: parsed.LOCATION ?? geo.displayName,
        landUse: parsed.LAND_USE ?? null,
        infrastructure: parsed.INFRASTRUCTURE ?? null,
        accessPoints: parsed.ACCESS_POINTS ?? null,
        strategic: parsed.STRATEGIC ?? null,
      };
    } else if (isNightVision) {
      result = {
        raw: content, geo,
        location: parsed.LOCATION ?? geo.displayName,
        urbanization: parsed.URBANIZATION ?? null,
        infrastructure: parsed.INFRASTRUCTURE ?? null,
        anomalies: parsed.ANOMALIES ?? null,
        lightPollution: parsed.LIGHT_POLLUTION ?? null,
        strategic: parsed.STRATEGIC ?? null,
      };
    } else {
      result = {
        raw: content, geo,
        location: parsed.LOCATION ?? geo.displayName,
        terrain: parsed.TERRAIN ?? null,
        features: parsed.FEATURES ?? null,
        activity: parsed.ACTIVITY ?? null,
        weather: parsed.WEATHER ?? null,
        strategic: parsed.STRATEGIC ?? null,
      };
    }
    cacheSet(aiCache, aiKey, result);
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Earth Gallery AI analysis failed');
    res.status(500).json({ error: 'Analysis failed' });
  }
});

export default router;
