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
import NewsAPIService, { NewsArticle } from './news-api';

export class ConflictService {
  // Get all conflicts
  static getAllConflicts(): Conflict[] {
    return conflictsDatabase;
  }

  // Get all news articles from NewsAPI
  static async getAllNews(): Promise<NewsArticle[]> {
    return await NewsAPIService.getConflictNews(20);
  }

  // Get news for specific conflict
  static async getNewsForConflict(conflictId: string): Promise<NewsArticle[]> {
    const conflict = getConflictById(conflictId);
    if (!conflict) return [];
    
    return await NewsAPIService.getNewsForConflict(
      conflictId, 
      conflict.country, 
      conflict.conflictType
    );
  }

  // Get top conflict headlines
  static async getTopConflictHeadlines(): Promise<NewsArticle[]> {
    return await NewsAPIService.getTopConflictHeadlines(10);
  }

  // Get conflicts filtered by region and status
  static getFilteredConflicts(
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
  static getConflictStatistics() {
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
  static searchConflicts(keyword: string): Conflict[] {
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
    const conflict = getConflictById(conflictId);
    const relatedNews = await this.getNewsForConflict(conflictId);

    return {
      conflict,
      relatedNews
    };
  }

  // Fetch latest conflict data with real news from NewsAPI
  static async fetchLatestConflictData(): Promise<{
    conflicts: Conflict[];
    news: NewsArticle[];
  }> {
    try {
      const news = await NewsAPIService.getConflictNews(15);
      return {
        conflicts: conflictsDatabase,
        news
      };
    } catch (error) {
      console.error('Error fetching latest data:', error);
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
        return '#ef4444'; // red-500
      case 'Warm':
        return '#f59e0b'; // amber-500
      case 'Improving':
        return '#10b981'; // emerald-500
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