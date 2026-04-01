import { MemoryCache } from '../live-activity/cache.js';
import { logger } from '../../config/logger.js';
import type {
  ACLEDRawEvent,
  ACLEDApiResponse,
  ConflictEventProperties,
  ConflictSeverity,
  ConflictSummary,
  ConflictsResponse,
} from './types.js';

// ── Config (read lazily so dotenv is loaded first) ────────
const ACLED_TOKEN_URL = 'https://acleddata.com/oauth/token';
const ACLED_API_URL = 'https://acleddata.com/api/acled/read';
function getCredentials() {
  return {
    email: process.env.ACLED_EMAIL ?? '',
    password: process.env.ACLED_PASSWORD ?? '',
  };
}

const FIELDS = [
  'event_id_cnty', 'event_date', 'event_type', 'sub_event_type',
  'disorder_type', 'actor1', 'actor2', 'country', 'iso',
  'admin1', 'latitude', 'longitude', 'fatalities', 'notes',
].join('|');

// Cache: events for 10 min, token for 23 hours
const eventsCache = new MemoryCache<ConflictsResponse>(10 * 60 * 1000);
let cachedToken: { token: string; expiresAt: number } | null = null;

// ── OAuth token ───────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const creds = getCredentials();
  if (!creds.email || !creds.password) {
    throw new Error('ACLED_EMAIL or ACLED_PASSWORD not set in environment');
  }

  logger.info({ email: creds.email }, 'Requesting ACLED OAuth token');

  const res = await fetch(ACLED_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: creds.email,
      password: creds.password,
      grant_type: 'password',
      client_id: 'acled',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, 'ACLED OAuth failed');
    throw new Error(`ACLED OAuth failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 3600) * 1000, // refresh 1h before expiry
  };

  logger.info('ACLED OAuth token acquired');
  return cachedToken.token;
}

// ── Severity logic ────────────────────────────────────────
function deriveSeverity(fatalities: number): ConflictSeverity {
  if (fatalities >= 50) return 'critical';
  if (fatalities >= 10) return 'high';
  if (fatalities >= 1) return 'medium';
  return 'low';
}

function deriveCountrySeverity(totalFatalities: number, totalEvents: number): ConflictSeverity {
  if (totalFatalities >= 500 || totalEvents >= 100) return 'critical';
  if (totalFatalities >= 100 || totalEvents >= 30) return 'high';
  if (totalFatalities >= 10 || totalEvents >= 5) return 'medium';
  return 'low';
}

// ── Transform raw ACLED event ─────────────────────────────
function transformEvent(raw: ACLEDRawEvent): {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: ConflictEventProperties;
} | null {
  const lat = parseFloat(raw.latitude);
  const lng = parseFloat(raw.longitude);
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;

  const fatalities = parseInt(raw.fatalities, 10) || 0;

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      id: raw.event_id_cnty,
      date: raw.event_date,
      eventType: raw.event_type,
      subEventType: raw.sub_event_type,
      disorderType: raw.disorder_type ?? '',
      actor1: raw.actor1 ?? '',
      actor2: raw.actor2 ?? '',
      country: raw.country,
      iso: raw.iso ?? '',
      region: raw.admin1 ?? '',
      fatalities,
      severity: deriveSeverity(fatalities),
      notes: raw.notes ? raw.notes.slice(0, 300) : '',
    },
  };
}

// ── Build country summaries ───────────────────────────────
function buildSummaries(
  features: ConflictsResponse['features'],
): ConflictSummary[] {
  const byCountry = new Map<string, {
    country: string;
    iso: string;
    events: number;
    fatalities: number;
    lats: number[];
    lngs: number[];
    dates: string[];
  }>();

  for (const f of features) {
    const key = f.properties.country;
    const existing = byCountry.get(key);
    if (existing) {
      existing.events += 1;
      existing.fatalities += f.properties.fatalities;
      existing.lats.push(f.geometry.coordinates[1]);
      existing.lngs.push(f.geometry.coordinates[0]);
      existing.dates.push(f.properties.date);
    } else {
      byCountry.set(key, {
        country: key,
        iso: f.properties.iso,
        events: 1,
        fatalities: f.properties.fatalities,
        lats: [f.geometry.coordinates[1]],
        lngs: [f.geometry.coordinates[0]],
        dates: [f.properties.date],
      });
    }
  }

  // Determine the most recent event date across all data to use as reference
  const allDates = features.map((f) => f.properties.date).filter(Boolean);
  const maxDateMs = allDates.length > 0
    ? Math.max(...allDates.map((d) => new Date(d).getTime()))
    : Date.now();
  // A country is "active" if it has events within the last 90 days relative to the dataset's newest event
  const activeThresholdMs = maxDateMs - 90 * 24 * 60 * 60 * 1000;

  return Array.from(byCountry.values())
    .map((c) => {
      const lastEventDate = c.dates.sort().reverse()[0] ?? '';
      const lastMs = new Date(lastEventDate).getTime();
      return {
        country: c.country,
        iso: c.iso,
        totalEvents: c.events,
        totalFatalities: c.fatalities,
        severity: deriveCountrySeverity(c.fatalities, c.events),
        active: lastMs >= activeThresholdMs,
        lastEventDate,
        lat: c.lats.reduce((a, b) => a + b, 0) / c.lats.length,
        lng: c.lngs.reduce((a, b) => a + b, 0) / c.lngs.length,
      };
    })
    .sort((a, b) => b.totalFatalities - a.totalFatalities);
}

// ── Main fetch ────────────────────────────────────────────
export async function getConflictEvents(): Promise<ConflictsResponse> {
  const cached = eventsCache.get();
  if (cached) return cached;

  try {
    const token = await getAccessToken();

    // Fetch most recent battles — order by date DESC to get latest available data
    // (account tier may have date restrictions, so we don't filter by date range)
    const params = new URLSearchParams({
      event_type: 'Battles',
      fields: FIELDS,
      limit: '2000',
      order: 'event_date|DESC',
    });

    const url = `${ACLED_API_URL}?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ status: res.status, body: errBody.slice(0, 500), url }, 'ACLED API error');
      throw new Error(`ACLED API error: ${res.status}`);
    }

    const json = (await res.json()) as ACLEDApiResponse;
    logger.info({ success: json.success, count: json.count, totalCount: json.total_count, dataLength: json.data?.length }, 'ACLED API response');

    if (!json.success || !json.data) {
      throw new Error('ACLED API returned unsuccessful response');
    }

    const features = json.data
      .map(transformEvent)
      .filter((f): f is NonNullable<typeof f> => f !== null);

    const response: ConflictsResponse = {
      type: 'FeatureCollection',
      features,
      summary: buildSummaries(features),
    };

    eventsCache.set(response);
    logger.info(`Fetched ${features.length} conflict events from ACLED`);
    return response;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch ACLED conflict events');
    const stale = eventsCache.get();
    if (stale) return stale;
    return { type: 'FeatureCollection', features: [], summary: [] };
  }
}
