import { Router, type Request, type Response } from 'express';
import { logger } from '../config/logger.js';

const router = Router();

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';

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
    return {
      name: data.name || addr.body_of_water || addr.ocean || addr.sea || null,
      country: addr.country ?? null,
      countryCode: addr.country_code?.toUpperCase() ?? null,
      state: addr.state ?? addr.region ?? null,
      city: addr.city ?? addr.town ?? addr.village ?? null,
      region: addr.county ?? addr.suburb ?? null,
      displayName: data.display_name ?? `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    };
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

router.post('/analyze', async (req: Request, res: Response) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI analysis not configured' });
    return;
  }

  const { imageUrl, lat, lng } = req.body;
  if (!imageUrl || lat === undefined || lng === undefined) {
    res.status(400).json({ error: 'imageUrl, lat, and lng are required' });
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

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze this observation point:\n\nCoordinates: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°\n\nReverse Geocoded Location:\n${locationCtx}\n\nSatellite Image: ${imageUrl}\n\nProvide your GEOINT analysis using real-world knowledge of this specific location.`,
          },
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
    for (const line of lines) {
      const match = line.match(/^(LOCATION|TERRAIN|FEATURES|ACTIVITY|WEATHER|STRATEGIC):\s*(.+)/i);
      if (match) parsed[match[1].toUpperCase()] = match[2].trim();
    }

    res.json({
      raw: content,
      geo,
      location: parsed.LOCATION ?? geo.displayName,
      terrain: parsed.TERRAIN ?? null,
      features: parsed.FEATURES ?? null,
      activity: parsed.ACTIVITY ?? null,
      weather: parsed.WEATHER ?? null,
      strategic: parsed.STRATEGIC ?? null,
    });
  } catch (err) {
    logger.error({ err }, 'Earth Gallery AI analysis failed');
    res.status(500).json({ error: 'Analysis failed' });
  }
});

export default router;
