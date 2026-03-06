// ACLED (Armed Conflict Location & Event Data) service
// Handles OAuth authentication and proxies requests to the ACLED API
// Credentials stay server-side only — never sent to the browser.

const OAUTH_URL = 'https://acleddata.com/oauth/token';
const API_URL = 'https://acleddata.com/api/acled/read';
const PAGE_SIZE = 50;

// ── Token cache ────────────────────────────────────────────────────────────
interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const email = process.env.ACLED_EMAIL;
  const password = process.env.ACLED_PASSWORD;

  if (!email || !password) {
    throw new Error('ACLED_EMAIL and ACLED_PASSWORD must be set in environment variables');
  }

  const body = new URLSearchParams({
    username: email,
    password,
    grant_type: 'password',
    client_id: 'acled',
  });

  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ACLED OAuth failed (${res.status}): ${text}`);
  }

  const data = await res.json() as {
    access_token: string;
    expires_in: number; // seconds
    token_type: string;
  };

  // Cache token with 60-second safety margin
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return tokenCache.accessToken;
}

// ── Data types ─────────────────────────────────────────────────────────────
export interface AcledEvent {
  data_id: string;
  event_id_cnty: string;
  event_date: string;
  year: string;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  country: string;
  admin1: string;
  admin2: string;
  location: string;
  latitude: string;
  longitude: string;
  fatalities: string;
  notes: string;
  source: string;
}

export interface AcledResponse {
  status: number;
  success: boolean;
  count: number;
  data: AcledEvent[];
}

export interface FetchEventsParams {
  country?: string;
  iso?: number;         // ISO numeric country code
  region?: number;      // ACLED region code
  eventType?: string;   // e.g. "Battles", "Explosions/Remote violence"
  dateFrom?: string;    // YYYY-MM-DD
  dateTo?: string;      // YYYY-MM-DD
  limit?: number;
  page?: number;
}

// ── Response cache (in-memory, per query) ──────────────────────────────────
interface DataCacheEntry {
  data: AcledEvent[];
  count: number;
  timestamp: number;
}

const dataCache = new Map<string, DataCacheEntry>();
const DATA_TTL = 30 * 60 * 1000; // 30 minutes

function cacheKey(params: FetchEventsParams): string {
  const ordered: Record<string, unknown> = {};
  for (const k of Object.keys(params).sort()) {
    ordered[k] = (params as Record<string, unknown>)[k];
  }
  return JSON.stringify(ordered);
}

// ── Main fetch function ─────────────────────────────────────────────────────
export async function fetchAcledEvents(params: FetchEventsParams): Promise<{
  data: AcledEvent[];
  count: number;
}> {
  const key = cacheKey(params);
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < DATA_TTL) {
    return { data: cached.data, count: cached.count };
  }

  const token = await getAccessToken();
  const limit = Math.min(params.limit ?? PAGE_SIZE, 500);
  const page = params.page ?? 1;

  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    fields: 'data_id|event_id_cnty|event_date|year|event_type|sub_event_type|actor1|actor2|country|admin1|admin2|location|latitude|longitude|fatalities|notes|source',
    export_type: 'json',
    order: 'desc',
    sort_by: 'event_date',
  });

  if (params.country) query.set('country', params.country);
  if (params.iso) query.set('iso', String(params.iso));
  if (params.region) query.set('region', String(params.region));
  if (params.eventType) query.set('event_type', params.eventType);
  // Only apply date filters if explicitly provided — don't restrict by default
  if (params.dateFrom) query.set('event_date', params.dateFrom);
  if (params.dateTo) query.set('event_date_to', params.dateTo);

  const res = await fetch(`${API_URL}?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ACLED API error (${res.status}): ${text}`);
  }

  const json = await res.json() as AcledResponse;

  const result = {
    data: json.data ?? [],
    count: json.count ?? 0,
  };

  dataCache.set(key, { ...result, timestamp: Date.now() });

  // Evict old entries
  if (dataCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of dataCache.entries()) {
      if (now - v.timestamp > DATA_TTL) dataCache.delete(k);
    }
  }

  return result;
}

// ── Country → ACLED country name mapping ────────────────────────────────────
// ACLED uses full English country names, not ISO codes in the query param.
// Expanded based on actual data availability in this account (2015-2019+).
export const COUNTRY_NAME_MAP: Record<string, string> = {
  // High-volume countries confirmed in this account
  IN: 'India',
  TR: 'Turkey',
  PK: 'Pakistan',
  TN: 'Tunisia',
  KE: 'Kenya',
  ET: 'Ethiopia',
  NG: 'Nigeria',
  IQ: 'Iraq',
  BD: 'Bangladesh',
  ZA: 'South Africa',
  NP: 'Nepal',
  EG: 'Egypt',
  KH: 'Cambodia',
  MM: 'Myanmar',
  SO: 'Somalia',
  ZM: 'Zambia',
  IR: 'Iran',
  IL: 'Israel',
  SD: 'Sudan',
  YE: 'Yemen',
  // Conflict zones
  UA: 'Ukraine',
  RU: 'Russia',
  PS: 'Palestine',
  SY: 'Syria',
  AF: 'Afghanistan',
  ML: 'Mali',
  LY: 'Libya',
  SS: 'South Sudan',
  CD: 'Democratic Republic of Congo',
  CF: 'Central African Republic',
  MX: 'Mexico',
  HT: 'Haiti',
  // Additional coverage
  TZ: 'Tanzania',
  UG: 'Uganda',
  MZ: 'Mozambique',
  CM: 'Cameroon',
  GH: 'Ghana',
  LB: 'Lebanon',
  JO: 'Jordan',
  MA: 'Morocco',
  DZ: 'Algeria',
  BI: 'Burundi',
  GA: 'Gabon',
  LR: 'Liberia',
  AO: 'Angola',
  VN: 'Vietnam',
  PH: 'Philippines',
  ID: 'Indonesia',
  TH: 'Thailand',
  BR: 'Brazil',
  VE: 'Venezuela',
  CO: 'Colombia',
};
