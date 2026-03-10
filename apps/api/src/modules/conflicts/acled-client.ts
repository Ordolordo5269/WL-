/**
 * ACLED API Client — OAuth2 + research-level field coverage
 *
 * Handles authentication, pagination, and full-field fetching from
 * the ACLED v3 API (https://acleddata.com/api/acled/read).
 */

const OAUTH_URL = 'https://acleddata.com/oauth/token';
const API_BASE = 'https://acleddata.com/api/acled/read';

// All research-level fields we request from ACLED
const ACLED_FIELDS = [
  'event_id_cnty',
  'event_date',
  'year',
  'time_precision',
  'disorder_type',
  'event_type',
  'sub_event_type',
  'actor1',
  'assoc_actor_1',
  'inter1',
  'actor2',
  'assoc_actor_2',
  'inter2',
  'interaction',
  'civilian_targeting',
  'iso',
  'country',
  'region',
  'admin1',
  'admin2',
  'admin3',
  'location',
  'latitude',
  'longitude',
  'geo_precision',
  'source',
  'source_scale',
  'notes',
  'fatalities',
  'tags',
  'timestamp',
].join('|');

// ── Token management ──

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const email = process.env.ACLED_EMAIL;
  const password = process.env.ACLED_PASSWORD;

  if (!email || !password) {
    throw new Error('ACLED_EMAIL and ACLED_PASSWORD must be set');
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

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 120) * 1000, // 2min safety margin
  };

  return tokenCache.accessToken;
}

// ── Raw ACLED event shape (all strings from API) ──

export interface RawAcledEvent {
  event_id_cnty: string;
  event_date: string;
  year: string;
  time_precision: string;
  disorder_type: string;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  assoc_actor_1: string;
  inter1: string;
  actor2: string;
  assoc_actor_2: string;
  inter2: string;
  interaction: string;
  civilian_targeting: string;
  iso: string;
  country: string;
  region: string;
  admin1: string;
  admin2: string;
  admin3: string;
  location: string;
  latitude: string;
  longitude: string;
  geo_precision: string;
  source: string;
  source_scale: string;
  notes: string;
  fatalities: string;
  tags: string;
  timestamp: string;
}

interface AcledApiResponse {
  status: number;
  success: boolean;
  count: number;
  data: RawAcledEvent[];
}

// ── Fetch params ──

export interface AcledFetchParams {
  country?: string;
  iso?: number;
  region?: string;
  eventType?: string;
  dateFrom?: string;    // YYYY-MM-DD
  dateTo?: string;      // YYYY-MM-DD
  actor?: string;
  limit?: number;       // max 5000
  page?: number;
}

/**
 * Fetch a single page of ACLED events.
 */
export async function fetchAcledPage(
  params: AcledFetchParams
): Promise<{ data: RawAcledEvent[]; count: number }> {
  const token = await getAccessToken();
  const limit = Math.min(params.limit ?? 5000, 5000);
  const page = params.page ?? 1;

  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    fields: ACLED_FIELDS,
    inter_num: '1', // numeric interaction codes
    sort_by: 'event_date',
    order: 'desc',
  });

  if (params.country) query.set('country', params.country);
  if (params.iso) query.set('iso', String(params.iso));
  if (params.region) query.set('region', params.region);
  if (params.eventType) query.set('event_type', params.eventType);

  // Date range — ACLED uses event_date + event_date_where for ranges
  if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ?? '1900-01-01';
    const to = params.dateTo ?? new Date().toISOString().split('T')[0];
    query.set('event_date', `${from}|${to}`);
    query.set('event_date_where', 'BETWEEN');
  }

  if (params.actor) {
    query.set('actor1', params.actor);
  }

  const res = await fetch(`${API_BASE}?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ACLED API error (${res.status}): ${text}`);
  }

  const json = (await res.json()) as AcledApiResponse;
  return { data: json.data ?? [], count: json.count ?? 0 };
}

/**
 * Fetch ALL pages of ACLED events matching params (auto-paginate).
 * Use for sync/backfill operations.
 */
export async function fetchAllAcledEvents(
  params: Omit<AcledFetchParams, 'page' | 'limit'>
): Promise<RawAcledEvent[]> {
  const all: RawAcledEvent[] = [];
  let page = 1;
  const PAGE_SIZE = 5000;

  while (true) {
    const { data } = await fetchAcledPage({ ...params, limit: PAGE_SIZE, page });
    all.push(...data);

    if (data.length < PAGE_SIZE) break; // last page
    page++;
  }

  return all;
}

/**
 * Parse a raw ACLED event into typed values suitable for Prisma upsert.
 */
export function parseRawEvent(raw: RawAcledEvent) {
  return {
    eventIdCnty: raw.event_id_cnty,
    eventDate: new Date(raw.event_date),
    year: parseInt(raw.year, 10),
    timePrecision: parseInt(raw.time_precision, 10) || 1,
    disorderType: raw.disorder_type || null,
    eventType: raw.event_type,
    subEventType: raw.sub_event_type,
    actor1: raw.actor1,
    assocActor1: raw.assoc_actor_1 || null,
    inter1: parseInt(raw.inter1, 10) || 0,
    actor2: raw.actor2 || null,
    assocActor2: raw.assoc_actor_2 || null,
    inter2: raw.inter2 ? parseInt(raw.inter2, 10) : null,
    interaction: parseInt(raw.interaction, 10) || 0,
    civilianTargeting: raw.civilian_targeting || null,
    iso: parseInt(raw.iso, 10),
    country: raw.country,
    region: raw.region,
    admin1: raw.admin1 || null,
    admin2: raw.admin2 || null,
    admin3: raw.admin3 || null,
    location: raw.location || null,
    latitude: parseFloat(raw.latitude),
    longitude: parseFloat(raw.longitude),
    geoPrecision: raw.geo_precision ? parseInt(raw.geo_precision, 10) : null,
    source: raw.source || null,
    sourceScale: raw.source_scale || null,
    notes: raw.notes || null,
    fatalities: parseInt(raw.fatalities, 10) || 0,
    tags: raw.tags || null,
    timestamp: raw.timestamp ? BigInt(raw.timestamp) : null,
  };
}
