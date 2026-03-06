import { prisma } from '../db/client';

const NEWS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get cached news for a conflict
 */
export async function getCachedNews(conflictId: string, limit: number = 10) {
  const conflict = await prisma.conflict.findUnique({
    where: { slug: conflictId },
    select: { id: true }
  });

  if (!conflict) {
    return [];
  }

  const cutoffDate = new Date(Date.now() - NEWS_CACHE_TTL);

  const cachedNews = await prisma.conflictNews.findMany({
    where: {
      conflictId: conflict.id,
      publishedAt: {
        gte: cutoffDate // Only get news from last 24 hours
      }
    },
    orderBy: { publishedAt: 'desc' },
    take: limit
  });

  return cachedNews;
}

/**
 * Cache news articles for a conflict
 */
export async function cacheNewsArticles(conflictId: string, articles: Array<{
  title: string;
  source: string;
  url: string;
  publishedAt: Date | string;
  description?: string;
  imageUrl?: string;
}>) {
  const conflict = await prisma.conflict.findUnique({
    where: { slug: conflictId },
    select: { id: true }
  });

  if (!conflict) {
    throw new Error(`Conflict not found: ${conflictId}`);
  }

  const results = [];

  for (const article of articles) {
    // Check if article already exists (by URL)
    const existing = await prisma.conflictNews.findFirst({
      where: {
        conflictId: conflict.id,
        url: article.url
      }
    });

    if (!existing) {
      const cached = await prisma.conflictNews.create({
        data: {
          conflictId: conflict.id,
          title: article.title,
          source: article.source,
          url: article.url,
          publishedAt: new Date(article.publishedAt),
          description: article.description || null,
          imageUrl: article.imageUrl || null
        }
      });
      results.push(cached);
    }
  }

  return results;
}

/**
 * Clear old cached news (older than TTL)
 */
export async function clearOldCachedNews() {
  const cutoffDate = new Date(Date.now() - NEWS_CACHE_TTL);

  const result = await prisma.conflictNews.deleteMany({
    where: {
      publishedAt: {
        lt: cutoffDate
      }
    }
  });

  return result.count;
}

/**
 * Get or fetch and cache news for a conflict
 */
export async function getOrFetchNews(
  conflictId: string,
  fetchFn: () => Promise<Array<{
    title: string;
    source: string;
    url: string;
    publishedAt: Date | string;
    description?: string;
    imageUrl?: string;
  }>>,
  limit: number = 10
) {
  // Try to get from cache first
  const cached = await getCachedNews(conflictId, limit);

  // If we have enough cached news, return it
  if (cached.length >= limit) {
    return cached;
  }

  // Otherwise, fetch fresh news
  try {
    const freshNews = await fetchFn();
    
    // Cache the fresh news
    if (freshNews.length > 0) {
      await cacheNewsArticles(conflictId, freshNews);
    }

    // Return combined (cached + fresh, up to limit)
    const combined = [...cached, ...freshNews]
      .sort((a, b) => {
        const dateA = a.publishedAt instanceof Date ? a.publishedAt : new Date(a.publishedAt);
        const dateB = b.publishedAt instanceof Date ? b.publishedAt : new Date(b.publishedAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);

    return combined;
  } catch (error) {
    console.error('Error fetching fresh news:', error);
    // Return cached news even if it's less than limit
    return cached;
  }
}

