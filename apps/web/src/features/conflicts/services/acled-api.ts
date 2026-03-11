// ACLED frontend service
// All calls go through the backend proxy — credentials never leave the server.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

export interface AcledResult {
  data: AcledEvent[];
  count: number;
}

// Aggregated counts per time bucket (year or month) for timeline charts
export interface AcledTimelineBucket {
  period: string;        // 'YYYY' or 'YYYY-MM'
  events: number;
  fatalities: number;
  byType: Record<string, number>;
}

export type AcledEventType =
  | 'Battles'
  | 'Explosions/Remote violence'
  | 'Violence against civilians'
  | 'Protests'
  | 'Riots'
  | 'Strategic developments';

// Color per event type for the UI
export const EVENT_TYPE_COLOR: Record<string, string> = {
  Battles: '#ef4444',
  'Explosions/Remote violence': '#f97316',
  'Violence against civilians': '#a855f7',
  Protests: '#3b82f6',
  Riots: '#eab308',
  'Strategic developments': '#6b7280',
};

// Mirrored from backend COUNTRY_NAME_MAP — all ISO-2 codes with ACLED data
export const SUPPORTED_ISOS = new Set([
  'IN', 'TR', 'PK', 'TN', 'KE', 'ET', 'NG', 'IQ', 'BD', 'ZA', 'NP', 'EG',
  'KH', 'MM', 'SO', 'ZM', 'IR', 'IL', 'SD', 'YE', 'UA', 'RU', 'PS', 'SY',
  'AF', 'ML', 'LY', 'SS', 'CD', 'CF', 'MX', 'HT', 'TZ', 'UG', 'MZ', 'CM',
  'GH', 'LB', 'JO', 'MA', 'DZ', 'BI', 'GA', 'LR', 'AO', 'VN', 'PH', 'ID',
  'TH', 'BR', 'VE', 'CO',
]);

// Cache keyed by URL string
const cache = new Map<string, { result: unknown; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

async function get<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.result as T;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ACLED proxy error ${res.status}: ${body}`);
  }

  const result = await res.json() as T;
  cache.set(url, { result, ts: Date.now() });
  return result;
}

/**
 * Fetch events for a conflict by ISO-2 country code (newest first).
 */
export async function fetchConflictEvents(
  countryIso: string,
  options: { limit?: number; page?: number; eventType?: AcledEventType; dateFrom?: string; dateTo?: string } = {}
): Promise<AcledResult> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.page) params.set('page', String(options.page));
  if (options.eventType) params.set('eventType', options.eventType);
  if (options.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options.dateTo) params.set('dateTo', options.dateTo);

  const qs = params.toString();
  const url = `${API_BASE}/api/acled/events/conflict/${countryIso}${qs ? '?' + qs : ''}`;
  return get<AcledResult>(url);
}

/**
 * Fetch events with full control over all parameters.
 */
export async function fetchEvents(options: {
  country?: string;
  dateFrom?: string;
  dateTo?: string;
  eventType?: AcledEventType;
  limit?: number;
  page?: number;
}): Promise<AcledResult> {
  const params = new URLSearchParams();
  if (options.country) params.set('country', options.country);
  if (options.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options.dateTo) params.set('dateTo', options.dateTo);
  if (options.eventType) params.set('eventType', options.eventType);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.page) params.set('page', String(options.page));

  const url = `${API_BASE}/api/acled/events?${params}`;
  return get<AcledResult>(url);
}

/**
 * Build a historical timeline from a batch of events.
 * Aggregates by year (granularity='year') or by month (granularity='month').
 */
export function buildTimeline(
  events: AcledEvent[],
  granularity: 'year' | 'month' = 'year'
): AcledTimelineBucket[] {
  const buckets = new Map<string, AcledTimelineBucket>();

  for (const ev of events) {
    const period = granularity === 'year'
      ? ev.event_date.slice(0, 4)
      : ev.event_date.slice(0, 7);

    if (!buckets.has(period)) {
      buckets.set(period, { period, events: 0, fatalities: 0, byType: {} });
    }

    const b = buckets.get(period)!;
    b.events += 1;
    b.fatalities += parseInt(ev.fatalities, 10) || 0;
    b.byType[ev.event_type] = (b.byType[ev.event_type] || 0) + 1;
  }

  return Array.from(buckets.values()).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Fetch enough pages to build a full historical timeline for a country.
 * Loads up to maxPages × 500 events (default: 20 pages = 10,000 events).
 */
export async function fetchTimelineData(
  countryIso: string,
  maxPages = 20
): Promise<{ events: AcledEvent[]; timeline: AcledTimelineBucket[] }> {
  const allEvents: AcledEvent[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const result = await fetchConflictEvents(countryIso, { limit: 500, page });
    allEvents.push(...result.data);
    if (result.data.length < 500) break; // last page
  }

  return { events: allEvents, timeline: buildTimeline(allEvents, 'year') };
}

// ISO 3166-1 alpha-3 → alpha-2 for all codes that appear in conflicts-data.ts
const ISO3_TO_ISO2: Record<string, string> = {
  AFG: 'AF', AGO: 'AO', ALB: 'AL', ARE: 'AE', ARG: 'AR', ARM: 'AM', AUS: 'AU',
  AUT: 'AT', AZE: 'AZ', BDI: 'BI', BEL: 'BE', BEN: 'BJ', BFA: 'BF', BGD: 'BD',
  BGR: 'BG', BHR: 'BH', BIH: 'BA', BLR: 'BY', BOL: 'BO', BRA: 'BR', BWA: 'BW',
  CAF: 'CF', CAN: 'CA', CHE: 'CH', CHL: 'CL', CHN: 'CN', CIV: 'CI', CMR: 'CM',
  COD: 'CD', COG: 'CG', COL: 'CO', CZE: 'CZ', DEU: 'DE', DJI: 'DJ', DNK: 'DK',
  DZA: 'DZ', ECU: 'EC', EGY: 'EG', ERI: 'ER', ESP: 'ES', ETH: 'ET', FIN: 'FI',
  FRA: 'FR', GAB: 'GA', GBR: 'GB', GHA: 'GH', GIN: 'GN', GMB: 'GM', GNB: 'GW',
  GRC: 'GR', GTM: 'GT', GUY: 'GY', HND: 'HN', HRV: 'HR', HTI: 'HT', HUN: 'HU',
  IDN: 'ID', IND: 'IN', IRL: 'IE', IRN: 'IR', IRQ: 'IQ', ISR: 'IL', ITA: 'IT',
  JAM: 'JM', JOR: 'JO', JPN: 'JP', KAZ: 'KZ', KEN: 'KE', KGZ: 'KG', KHM: 'KH',
  KOR: 'KR', KWT: 'KW', LAO: 'LA', LBN: 'LB', LBR: 'LR', LBY: 'LY', LKA: 'LK',
  LSO: 'LS', MAR: 'MA', MDA: 'MD', MDG: 'MG', MEX: 'MX', MKD: 'MK', MLI: 'ML',
  MMR: 'MM', MNE: 'ME', MOZ: 'MZ', MRT: 'MR', MWI: 'MW', MYS: 'MY', NAM: 'NA',
  NER: 'NE', NGA: 'NG', NIC: 'NI', NLD: 'NL', NOR: 'NO', NPL: 'NP', NZL: 'NZ',
  OMN: 'OM', PAK: 'PK', PAN: 'PA', PER: 'PE', PHL: 'PH', PNG: 'PG', POL: 'PL',
  PRK: 'KP', PRT: 'PT', PRY: 'PY', PSE: 'PS', QAT: 'QA', ROU: 'RO', RUS: 'RU',
  RWA: 'RW', SAU: 'SA', SDN: 'SD', SEN: 'SN', SLE: 'SL', SLV: 'SV', SOM: 'SO',
  SRB: 'RS', SSD: 'SS', SUR: 'SR', SVK: 'SK', SWE: 'SE', SWZ: 'SZ', SYR: 'SY',
  TCD: 'TD', TGO: 'TG', THA: 'TH', TJK: 'TJ', TKM: 'TM', TLS: 'TL', TUN: 'TN',
  TUR: 'TR', TWN: 'TW', TZA: 'TZ', UGA: 'UG', UKR: 'UA', URY: 'UY', UZB: 'UZ',
  VEN: 'VE', VNM: 'VN', YEM: 'YE', ZAF: 'ZA', ZMB: 'ZM', ZWE: 'ZW',
};

/** Map from a conflict's involvedISO array to the primary country ISO-2 */
export function primaryIsoFromConflict(involvedISO: string[]): string | null {
  if (!involvedISO || involvedISO.length === 0) return null;
  for (const code of involvedISO) {
    const upper = code.toUpperCase();
    // Try alpha-2 directly
    if (SUPPORTED_ISOS.has(upper)) return upper;
    // Try converting alpha-3 → alpha-2
    const iso2 = ISO3_TO_ISO2[upper];
    if (iso2 && SUPPORTED_ISOS.has(iso2)) return iso2;
  }
  return null;
}

export function formatFatalities(n: string | number): string {
  const v = typeof n === 'string' ? parseInt(n, 10) : n;
  if (isNaN(v)) return '0';
  return v.toLocaleString();
}
