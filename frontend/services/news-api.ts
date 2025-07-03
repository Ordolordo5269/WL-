// News API integration service
import type { NewsAPIArticle, NewsAPIResponse, NewsArticle } from '../src/types/index';
import { ErrorHandler } from '../src/utils/errorHandler.js';

class NewsAPIService {
  private static readonly API_KEY = '293aef4458c249c29d718a7664779a30';
  private static readonly BASE_URL = 'https://newsapi.org/v2';

  // Convert NewsAPI article to our NewsArticle format
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
      const query = '("armed conflict" OR "civil war" OR "military operation" OR "insurgency" OR "territorial dispute" OR "ethnic violence" OR "sectarian conflict" OR "border conflict" OR "peacekeeping" OR "ceasefire") AND -sports AND -entertainment';
      const url = `${this.BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&language=en&apiKey=${this.API_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }
      
      const data: NewsAPIResponse = await response.json();
      
      // Filter articles to ensure they're truly conflict-related
      const conflictKeywords = ['conflict', 'war', 'military', 'insurgency', 'violence', 'attack', 'battle', 'fighting', 'troops', 'armed', 'ceasefire', 'peace', 'rebel', 'militant', 'terrorism', 'crisis', 'dispute', 'invasion', 'occupation'];
      const filteredArticles = data.articles.filter(article => {
        const text = (article.title + ' ' + (article.description || '')).toLowerCase();
        return conflictKeywords.some(keyword => text.includes(keyword));
      });
      
      return filteredArticles.map(article => this.convertToNewsArticle(article));
    } catch (error) {
      ErrorHandler.logAPIError('NewsAPI', 'fetchConflictNews', error);
      return [];
    }
  }

  // Get news for specific country/region
  static async getNewsForCountry(country: string, pageSize: number = 10): Promise<NewsArticle[]> {
    try {
      const query = `"${country}" AND ("armed conflict" OR "civil war" OR "military operation" OR "insurgency" OR "violence" OR "fighting" OR "attack" OR "battle" OR "troops" OR "rebel" OR "militant" OR "ceasefire" OR "peace talks" OR "security forces") AND -sports AND -entertainment`;
      const url = `${this.BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&language=en&apiKey=${this.API_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }
      
      const data: NewsAPIResponse = await response.json();
      return data.articles.map(article => this.convertToNewsArticle(article));
    } catch (error) {
      ErrorHandler.logAPIError('NewsAPI', `fetchNewsForCountry(${country})`, error);
      return [];
    }
  }

  // Get news for specific conflict by searching related terms
  static async getNewsForConflict(conflictId: string, country: string, conflictType: string): Promise<NewsArticle[]> {
    try {
      let specificTerms: string[] = [];
      
      // Add specific terms based on conflict type
      if (conflictType.toLowerCase().includes('civil')) {
        specificTerms = ['"civil war"', 'government forces', 'opposition', 'rebel groups'];
      } else if (conflictType.toLowerCase().includes('insurgency')) {
        specificTerms = ['insurgency', 'insurgent', 'militant groups', 'counterinsurgency', 'guerrilla'];
      } else if (conflictType.toLowerCase().includes('interstate')) {
        specificTerms = ['border conflict', 'military confrontation', 'territorial dispute', 'cross-border'];
      } else if (conflictType.toLowerCase().includes('ethnic')) {
        specificTerms = ['ethnic violence', 'communal conflict', 'sectarian', 'ethnic tensions'];
      } else {
        specificTerms = ['armed conflict', 'violence', 'fighting', 'military operation'];
      }
      
      const query = `"${country}" AND (${specificTerms.join(' OR ')}) AND -sports AND -entertainment`;
      const url = `${this.BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=8&language=en&apiKey=${this.API_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }
      
      const data: NewsAPIResponse = await response.json();
      return data.articles.map(article => this.convertToNewsArticle(article, conflictId));
    } catch (error) {
      ErrorHandler.logAPIError('NewsAPI', `fetchNewsForConflict(${conflictId})`, error);
      return [];
    }
  }

  // Get top headlines related to conflicts
  static async getTopConflictHeadlines(pageSize: number = 15): Promise<NewsArticle[]> {
    try {
      // Search for conflict-related top headlines with specific query
      const query = '("armed conflict" OR "military" OR "war" OR "insurgency" OR "violence" OR "attack" OR "battle" OR "fighting" OR "ceasefire" OR "peace" OR "troops" OR "rebel" OR "militant") AND -sports AND -entertainment';
      const url = `${this.BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=popularity&pageSize=${pageSize}&language=en&apiKey=${this.API_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }
      
      const data: NewsAPIResponse = await response.json();
      
      // Enhanced filtering for conflict-related headlines
      const conflictKeywords = ['war', 'conflict', 'crisis', 'violence', 'military', 'attack', 'battle', 'fighting', 'troops', 'armed', 'ceasefire', 'peace', 'rebel', 'militant', 'terrorism', 'insurgency', 'invasion', 'occupation', 'siege', 'airstrike', 'bombing', 'casualties', 'wounded', 'killed'];
      const conflictArticles = data.articles.filter(article => {
        const text = (article.title + ' ' + (article.description || '')).toLowerCase();
        return conflictKeywords.some(keyword => text.includes(keyword)) &&
               !text.includes('sport') && !text.includes('game') && !text.includes('movie') && !text.includes('film');
      });
      
      return conflictArticles.slice(0, 10).map(article => this.convertToNewsArticle(article));
    } catch (error) {
      ErrorHandler.logAPIError('NewsAPI', 'fetchTopConflictHeadlines', error);
      return [];
    }
  }
}

export default NewsAPIService;