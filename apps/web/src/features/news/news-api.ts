// News API integration service
// Now proxied through the backend to keep the API key secure
import type { NewsAPIArticle, NewsArticle } from '../../types/index';
export type { NewsArticle };
import { ErrorHandler } from '../../utils/errorHandler.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class NewsAPIService {
  // Convert API article shape to our NewsArticle format
  private static convertToNewsArticle(apiArticle: NewsAPIArticle, conflictId?: string): NewsArticle {
    return {
      id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: apiArticle.title,
      source: apiArticle.source.name,
      date: apiArticle.publishedAt,
      url: apiArticle.url,
      conflictId,
      description: apiArticle.description || undefined,
      imageUrl: apiArticle.urlToImage || undefined
    };
  }

  // Get general conflict-related news
  static async getConflictNews(pageSize: number = 20): Promise<NewsArticle[]> {
    try {
      const response = await fetch(`${API_BASE}/api/news/conflicts?pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error(`News proxy error: ${response.status}`);
      }

      const data = await response.json();
      return (data.articles || []).map((article: NewsAPIArticle) =>
        this.convertToNewsArticle(article)
      );
    } catch (error) {
      ErrorHandler.logAPIError('NewsAPI', 'fetchConflictNews', error);
      return [];
    }
  }

  // Get news for specific country/region
  static async getNewsForCountry(country: string, pageSize: number = 10): Promise<NewsArticle[]> {
    try {
      const response = await fetch(
        `${API_BASE}/api/news/country/${encodeURIComponent(country)}?pageSize=${pageSize}`
      );
      if (!response.ok) {
        throw new Error(`News proxy error: ${response.status}`);
      }

      const data = await response.json();
      return (data.articles || []).map((article: NewsAPIArticle) =>
        this.convertToNewsArticle(article)
      );
    } catch (error) {
      ErrorHandler.logAPIError('NewsAPI', `fetchNewsForCountry(${country})`, error);
      return [];
    }
  }

  // Get news for specific conflict by searching related terms
  static async getNewsForConflict(conflictId: string, country: string, conflictType: string): Promise<NewsArticle[]> {
    try {
      const params = new URLSearchParams({ country, type: conflictType });
      const response = await fetch(`${API_BASE}/api/news/conflict?${params}`);
      if (!response.ok) {
        throw new Error(`News proxy error: ${response.status}`);
      }

      const data = await response.json();
      return (data.articles || []).map((article: NewsAPIArticle) =>
        this.convertToNewsArticle(article, conflictId)
      );
    } catch (error) {
      ErrorHandler.logAPIError('NewsAPI', `fetchNewsForConflict(${conflictId})`, error);
      return [];
    }
  }

  // Get top headlines related to conflicts
  static async getTopConflictHeadlines(pageSize: number = 15): Promise<NewsArticle[]> {
    try {
      const response = await fetch(`${API_BASE}/api/news/headlines?pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error(`News proxy error: ${response.status}`);
      }

      const data = await response.json();
      return (data.articles || []).map((article: NewsAPIArticle) =>
        this.convertToNewsArticle(article)
      );
    } catch (error) {
      ErrorHandler.logAPIError('NewsAPI', 'fetchTopConflictHeadlines', error);
      return [];
    }
  }
}

export default NewsAPIService;
