// Conflict Tracker Service
// This file contains all the business logic and data operations for the conflict tracker

import {
  Conflict,
  conflictsDatabase,
  getConflictsByRegion,
  getConflictsByStatus,
  getAllRegions,
  getConflictById
} from '../data/conflicts-data';
import { ErrorHandler } from '../src/utils/errorHandler.js';
import NewsAPIService, { NewsArticle } from './news-api';
import ConflictAPIService from './conflict-api';

// Cache for API conflicts to avoid repeated calls
let cachedApiConflicts: Conflict[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class ConflictService {
  // Get all conflicts - tries API first, falls back to static data
  static async getAllConflicts(): Promise<Conflict[]> {
    // Check cache first
    if (cachedApiConflicts && Date.now() - cacheTimestamp < CACHE_TTL) {
      return cachedApiConflicts;
    }

    try {
      const result = await ConflictAPIService.getAllConflicts();
      cachedApiConflicts = result.data;
      cacheTimestamp = Date.now();
      return result.data;
    } catch (error) {
      ErrorHandler.logServiceError('ConflictService', 'getAllConflicts (API fallback)', error);
      // Fallback to static data
      return conflictsDatabase;
    }
  }
  
  // Get conflicts with pagination
  static async getConflictsPaginated(filters?: any): Promise<{ data: Conflict[]; pagination: any }> {
    try {
      return await ConflictAPIService.getAllConflicts(filters);
    } catch (error) {
      ErrorHandler.logServiceError('ConflictService', 'getConflictsPaginated (API fallback)', error);
      // Fallback to static data
      const filtered = this.getFilteredConflictsSync(filters?.region, filters?.status);
      return {
        data: filtered,
        pagination: {
          page: 1,
          limit: filtered.length,
          total: filtered.length,
          totalPages: 1,
          hasMore: false
        }
      };
    }
  }

  // Synchronous version for backward compatibility (uses static data)
  static getAllConflictsSync(): Conflict[] {
    return conflictsDatabase;
  }

  // Get all news articles from NewsAPI
  static async getAllNews(): Promise<NewsArticle[]> {
    return await NewsAPIService.getConflictNews(20);
  }

  // Get news for specific conflict (with caching)
  static async getNewsForConflict(conflictId: string): Promise<NewsArticle[]> {
    try {
      // Try to get from cache first
      const cachedResponse = await fetch(`/api/conflicts/${conflictId}/news?limit=10`);
      if (cachedResponse.ok) {
        const cachedNews = await cachedResponse.json();
        if (cachedNews.length >= 5) {
          // Return cached news if we have enough
          return cachedNews.map((n: any) => ({
            id: n.id,
            title: n.title,
            source: n.source,
            date: n.publishedAt,
            url: n.url,
            conflictId,
            description: n.description,
            imageUrl: n.imageUrl
          }));
        }
      }

      // If not enough cached news, fetch from NewsAPI
      const conflict = getConflictById(conflictId);
      if (!conflict) return [];

      const freshNews = await NewsAPIService.getNewsForConflict(
        conflictId, 
        conflict.country, 
        conflict.conflictType
      );

      // Cache the fresh news
      if (freshNews.length > 0) {
        try {
          await fetch(`/api/conflicts/${conflictId}/news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(freshNews.map(n => ({
              title: n.title,
              source: n.source,
              url: n.url,
              publishedAt: n.date,
              description: n.description,
              imageUrl: n.imageUrl
            })))
          });
        } catch (e) {
          // Silently fail caching - not critical
          console.warn('Failed to cache news:', e);
        }
      }

      return freshNews;
    } catch (error) {
      ErrorHandler.logServiceError('ConflictService', 'getNewsForConflict', error);
      // Fallback to NewsAPI directly
      const conflict = getConflictById(conflictId);
      if (!conflict) return [];
      return await NewsAPIService.getNewsForConflict(conflictId, conflict.country, conflict.conflictType);
    }
  }

  // Get top conflict headlines
  static async getTopConflictHeadlines(): Promise<NewsArticle[]> {
    return await NewsAPIService.getTopConflictHeadlines(10);
  }

  // Get conflicts filtered by region and status
  static async getFilteredConflicts(
    region?: string,
    status?: 'War' | 'Warm' | 'Improving'
  ): Promise<Conflict[]> {
    try {
      const filters: any = {};
      if (region && region !== 'All') filters.region = region;
      if (status && status !== 'All') filters.status = status;

      const result = await ConflictAPIService.getAllConflicts(filters);
      return result.data;
    } catch (error) {
      ErrorHandler.logServiceError('ConflictService', 'getFilteredConflicts (API fallback)', error);
      // Fallback to static data
      let filtered = conflictsDatabase;

      if (region && region !== 'All') {
        filtered = getConflictsByRegion(region);
      }

      if (status && status !== 'All') {
        filtered = filtered.filter(conflict => conflict.status === status);
      }

      return filtered;
    }
  }

  // Synchronous version for backward compatibility
  static getFilteredConflictsSync(
    region?: string,
    status?: 'War' | 'Warm' | 'Improving'
  ): Conflict[] {
    let filtered = conflictsDatabase;

    if (region && region !== 'All') {
      filtered = getConflictsByRegion(region);
    }

    if (status && status !== 'All') {
      filtered = filtered.filter(conflict => conflict.status === status);
    }

    return filtered;
  }

  // Get available regions
  static getAvailableRegions(): string[] {
    return ['All', ...getAllRegions()];
  }

  // Get available statuses
  static getAvailableStatuses(): string[] {
    return ['All', 'War', 'Warm', 'Improving'];
  }

  // Get conflict statistics
  static async getConflictStatistics() {
    try {
      const stats = await ConflictAPIService.getConflictStats();
      // Transform API stats to match expected format
      return {
        total: stats.total,
        warCount: stats.byStatus.WAR || 0,
        warmCount: stats.byStatus.WARM || 0,
        improvingCount: stats.byStatus.IMPROVING || 0,
        totalCasualties: 0, // Would need to calculate from conflicts
        regionDistribution: stats.byRegion
      };
    } catch (error) {
      ErrorHandler.logServiceError('ConflictService', 'getConflictStatistics (API fallback)', error);
      // Fallback to static data
      const total = conflictsDatabase.length;
      const warCount = getConflictsByStatus('War').length;
      const warmCount = getConflictsByStatus('Warm').length;
      const improvingCount = getConflictsByStatus('Improving').length;
      const totalCasualties = conflictsDatabase.reduce((sum, conflict) => sum + conflict.casualties, 0);

      return {
        total,
        warCount,
        warmCount,
        improvingCount,
        totalCasualties,
        regionDistribution: this.getRegionDistribution()
      };
    }
  }

  // Synchronous version for backward compatibility
  static getConflictStatisticsSync() {
    const total = conflictsDatabase.length;
    const warCount = getConflictsByStatus('War').length;
    const warmCount = getConflictsByStatus('Warm').length;
    const improvingCount = getConflictsByStatus('Improving').length;
    const totalCasualties = conflictsDatabase.reduce((sum, conflict) => sum + conflict.casualties, 0);

    return {
      total,
      warCount,
      warmCount,
      improvingCount,
      totalCasualties,
      regionDistribution: this.getRegionDistribution()
    };
  }

  // Get region distribution
  private static getRegionDistribution() {
    const regions = getAllRegions();
    return regions.map(region => ({
      region,
      count: getConflictsByRegion(region).length
    }));
  }

  // Get news related to a specific conflict
  static getConflictNews(conflictId: string): NewsArticle[] {
    return getNewsForConflict(conflictId);
  }

  // Get news for a specific country
  static async getNewsForCountry(country: string): Promise<NewsArticle[]> {
    return await NewsAPIService.getNewsForCountry(country, 15);
  }

  // Get recent conflicts (last 2 years)
  static getRecentConflicts(): Conflict[] {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    return conflictsDatabase.filter(conflict => {
      const conflictDate = new Date(conflict.date);
      return conflictDate >= twoYearsAgo;
    });
  }

  // Get conflicts by severity (based on casualties)
  static getConflictsBySeverity(): {
    high: Conflict[];
    medium: Conflict[];
    low: Conflict[];
  } {
    const high = conflictsDatabase.filter(c => c.casualties >= 100000);
    const medium = conflictsDatabase.filter(c => c.casualties >= 10000 && c.casualties < 100000);
    const low = conflictsDatabase.filter(c => c.casualties < 10000);

    return { high, medium, low };
  }

  // Search conflicts by keyword
  static async searchConflicts(keyword: string): Promise<Conflict[]> {
    try {
      return await ConflictAPIService.searchConflicts(keyword);
    } catch (error) {
      ErrorHandler.logServiceError('ConflictService', 'searchConflicts (API fallback)', error);
      // Fallback to static data
      const searchTerm = keyword.toLowerCase();
      return conflictsDatabase.filter(conflict => 
        conflict.country.toLowerCase().includes(searchTerm) ||
        conflict.description.toLowerCase().includes(searchTerm) ||
        conflict.conflictType.toLowerCase().includes(searchTerm)
      );
    }
  }

  // Synchronous version for backward compatibility
  static searchConflictsSync(keyword: string): Conflict[] {
    const searchTerm = keyword.toLowerCase();
    return conflictsDatabase.filter(conflict => 
      conflict.country.toLowerCase().includes(searchTerm) ||
      conflict.description.toLowerCase().includes(searchTerm) ||
      conflict.conflictType.toLowerCase().includes(searchTerm)
    );
  }

  // Get conflict details with related news
  static async getConflictDetails(conflictId: string): Promise<{
    conflict: Conflict | undefined;
    relatedNews: NewsArticle[];
  }> {
    try {
      // Try to get from API first (by slug)
      let conflict = await ConflictAPIService.getConflictBySlug(conflictId);
      
      // If not found by slug, try by ID
      if (!conflict) {
        conflict = await ConflictAPIService.getConflictById(conflictId);
      }

      // Fallback to static data
      if (!conflict) {
        conflict = getConflictById(conflictId);
      }

      const relatedNews = await this.getNewsForConflict(conflictId);

      return {
        conflict,
        relatedNews
      };
    } catch (error) {
      ErrorHandler.logServiceError('ConflictService', 'getConflictDetails (API fallback)', error);
      // Fallback to static data
      const conflict = getConflictById(conflictId);
      const relatedNews = await this.getNewsForConflict(conflictId);

      return {
        conflict,
        relatedNews
      };
    }
  }

  // Fetch latest conflict data with real news from NewsAPI
  static async fetchLatestConflictData(): Promise<{
    conflicts: Conflict[];
    news: NewsArticle[];
  }> {
    try {
      const [conflicts, news] = await Promise.all([
        this.getAllConflicts(),
        NewsAPIService.getConflictNews(15)
      ]);
      return {
        conflicts,
        news
      };
    } catch (error) {
      ErrorHandler.logServiceError('ConflictService', 'fetchLatestData', error);
      return {
        conflicts: conflictsDatabase,
        news: []
      };
    }
  }

  // Format casualty numbers for display
  static formatCasualties(casualties: number): string {
    if (casualties >= 1000000) {
      return `${(casualties / 1000000).toFixed(1)}M`;
    } else if (casualties >= 1000) {
      return `${(casualties / 1000).toFixed(1)}K`;
    }
    return casualties.toString();
  }

  // Get status color for UI
  static getStatusColor(status: 'War' | 'Warm' | 'Improving'): string {
    switch (status) {
      case 'War':
        return '#8B0000'; // dark red
      case 'Warm':
        return '#B8860B'; // dark goldenrod
      case 'Improving':
        return '#556B2F'; // dark olive green
      default:
        return '#6b7280'; // gray-500
    }
  }

  // Get status icon for UI
  static getStatusIcon(status: 'War' | 'Warm' | 'Improving'): string {
    switch (status) {
      case 'War':
        return '🔴';
      case 'Warm':
        return '🟡';
      case 'Improving':
        return '🟢';
      default:
        return '⚪';
    }
  }
}

export default ConflictService;