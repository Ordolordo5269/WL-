// ══════════════════════════════════════════════════════════════════════════════
// NewsAPI proxy (keeps API key server-side)
// ══════════════════════════════════════════════════════════════════════════════

interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

interface NewsCacheEntry {
  data: NewsAPIArticle[];
  timestamp: number;
}

const CONFLICT_KEYWORDS = [
  'conflict', 'war', 'military', 'insurgency', 'violence', 'attack',
  'battle', 'fighting', 'troops', 'armed', 'ceasefire', 'peace',
  'rebel', 'militant', 'terrorism', 'crisis', 'dispute', 'invasion',
  'occupation',
];

const newsCache = new Map<string, NewsCacheEntry>();
const NEWS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getNewsCached(key: string): NewsAPIArticle[] | null {
  const entry = newsCache.get(key);
  if (entry && Date.now() - entry.timestamp < NEWS_CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setNewsCache(key: string, data: NewsAPIArticle[]): void {
  newsCache.set(key, { data, timestamp: Date.now() });
  if (newsCache.size > 100) {
    const oldest = [...newsCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 20; i++) {
      newsCache.delete(oldest[i][0]);
    }
  }
}

function getNewsApiKey(): string {
  const key = process.env.NEWS_API_KEY;
  if (!key) {
    throw new Error('NEWS_API_KEY environment variable is not set');
  }
  return key;
}

function isConflictRelated(article: NewsAPIArticle): boolean {
  const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
  return CONFLICT_KEYWORDS.some((kw) => text.includes(kw));
}

export async function fetchConflictNews(pageSize: number = 20): Promise<NewsAPIArticle[]> {
  const cacheKey = `conflict-news-${pageSize}`;
  const cached = getNewsCached(cacheKey);
  if (cached) return cached;

  const query =
    '("armed conflict" OR "civil war" OR "military operation" OR "insurgency" OR "territorial dispute" OR "ethnic violence" OR "sectarian conflict" OR "border conflict" OR "peacekeeping" OR "ceasefire") AND -sports AND -entertainment';

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&language=en&apiKey=${getNewsApiKey()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status}`);
  }

  const data: NewsAPIResponse = await response.json();
  const filtered = data.articles.filter(isConflictRelated);
  setNewsCache(cacheKey, filtered);
  return filtered;
}

export async function fetchNewsForCountry(
  country: string,
  pageSize: number = 10
): Promise<NewsAPIArticle[]> {
  const cacheKey = `country-news-${country}-${pageSize}`;
  const cached = getNewsCached(cacheKey);
  if (cached) return cached;

  const query = `"${country}" AND ("armed conflict" OR "civil war" OR "military operation" OR "insurgency" OR "violence" OR "fighting" OR "attack" OR "battle" OR "troops" OR "rebel" OR "militant" OR "ceasefire" OR "peace talks" OR "security forces") AND -sports AND -entertainment`;

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&language=en&apiKey=${getNewsApiKey()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status}`);
  }

  const data: NewsAPIResponse = await response.json();
  setNewsCache(cacheKey, data.articles);
  return data.articles;
}

export async function fetchNewsForConflict(
  country: string,
  conflictType: string,
  pageSize: number = 8
): Promise<NewsAPIArticle[]> {
  const cacheKey = `conflict-specific-${country}-${conflictType}-${pageSize}`;
  const cached = getNewsCached(cacheKey);
  if (cached) return cached;

  let specificTerms: string[];
  const type = conflictType.toLowerCase();

  if (type.includes('civil')) {
    specificTerms = ['"civil war"', 'government forces', 'opposition', 'rebel groups'];
  } else if (type.includes('insurgency')) {
    specificTerms = ['insurgency', 'insurgent', 'militant groups', 'counterinsurgency', 'guerrilla'];
  } else if (type.includes('interstate')) {
    specificTerms = ['border conflict', 'military confrontation', 'territorial dispute', 'cross-border'];
  } else if (type.includes('ethnic')) {
    specificTerms = ['ethnic violence', 'communal conflict', 'sectarian', 'ethnic tensions'];
  } else {
    specificTerms = ['armed conflict', 'violence', 'fighting', 'military operation'];
  }

  const query = `"${country}" AND (${specificTerms.join(' OR ')}) AND -sports AND -entertainment`;
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&language=en&apiKey=${getNewsApiKey()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status}`);
  }

  const data: NewsAPIResponse = await response.json();
  setNewsCache(cacheKey, data.articles);
  return data.articles;
}

export async function fetchTopConflictHeadlines(pageSize: number = 15): Promise<NewsAPIArticle[]> {
  const cacheKey = `top-headlines-${pageSize}`;
  const cached = getNewsCached(cacheKey);
  if (cached) return cached;

  const query =
    '("armed conflict" OR "military" OR "war" OR "insurgency" OR "violence" OR "attack" OR "battle" OR "fighting" OR "ceasefire" OR "peace" OR "troops" OR "rebel" OR "militant") AND -sports AND -entertainment';

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=popularity&pageSize=${pageSize}&language=en&apiKey=${getNewsApiKey()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status}`);
  }

  const data: NewsAPIResponse = await response.json();
  const filtered = data.articles
    .filter(isConflictRelated)
    .filter((a) => {
      const text = ((a.title || '') + ' ' + (a.description || '')).toLowerCase();
      return !text.includes('sport') && !text.includes('game') && !text.includes('movie') && !text.includes('film');
    })
    .slice(0, 10);

  setNewsCache(cacheKey, filtered);
  return filtered;
}

// ══════════════════════════════════════════════════════════════════════════════
// News DB cache — removed (ConflictNews model replaced by ACLED integration)
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// ACLED (Armed Conflict Location & Event Data)
// ══════════════════════════════════════════════════════════════════════════════

const OAUTH_URL = 'https://acleddata.com/oauth/token';
const API_URL = 'https://acleddata.com/api/acled/read';
const PAGE_SIZE = 50;

interface TokenCache {
  accessToken: string;
  expiresAt: number;
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
    expires_in: number;
    token_type: string;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return tokenCache.accessToken;
}

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
  iso?: number;
  region?: number;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  page?: number;
}

interface DataCacheEntry {
  data: AcledEvent[];
  count: number;
  timestamp: number;
}

const dataCache = new Map<string, DataCacheEntry>();
const DATA_TTL = 30 * 60 * 1000;

function acledCacheKey(params: FetchEventsParams): string {
  return JSON.stringify(params);
}

export async function fetchAcledEvents(params: FetchEventsParams): Promise<{
  data: AcledEvent[];
  count: number;
}> {
  const key = acledCacheKey(params);
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

  if (dataCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of dataCache.entries()) {
      if (now - v.timestamp > DATA_TTL) dataCache.delete(k);
    }
  }

  return result;
}

export const COUNTRY_NAME_MAP: Record<string, string> = {
  IN: 'India', TR: 'Turkey', PK: 'Pakistan', TN: 'Tunisia',
  KE: 'Kenya', ET: 'Ethiopia', NG: 'Nigeria', IQ: 'Iraq',
  BD: 'Bangladesh', ZA: 'South Africa', NP: 'Nepal', EG: 'Egypt',
  KH: 'Cambodia', MM: 'Myanmar', SO: 'Somalia', ZM: 'Zambia',
  IR: 'Iran', IL: 'Israel', SD: 'Sudan', YE: 'Yemen',
  UA: 'Ukraine', RU: 'Russia', PS: 'Palestine', SY: 'Syria',
  AF: 'Afghanistan', ML: 'Mali', LY: 'Libya', SS: 'South Sudan',
  CD: 'Democratic Republic of Congo', CF: 'Central African Republic',
  MX: 'Mexico', HT: 'Haiti',
  TZ: 'Tanzania', UG: 'Uganda', MZ: 'Mozambique', CM: 'Cameroon',
  GH: 'Ghana', LB: 'Lebanon', JO: 'Jordan', MA: 'Morocco',
  DZ: 'Algeria', BI: 'Burundi', GA: 'Gabon', LR: 'Liberia',
  AO: 'Angola', VN: 'Vietnam', PH: 'Philippines', ID: 'Indonesia',
  TH: 'Thailand', BR: 'Brazil', VE: 'Venezuela', CO: 'Colombia',
};
