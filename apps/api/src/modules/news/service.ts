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

