// Conflict Tracker Service
// This file contains all the business logic and data operations for the conflict tracker

import {
  Conflict,
  NewsArticle,
  conflictsDatabase,
  newsDatabase,
  getConflictsByRegion,
  getConflictsByStatus,
  getNewsForConflict,
  getAllRegions,
  getConflictById
} from '../data/conflicts-data';

export class ConflictService {
  // Get all conflicts
  static getAllConflicts(): Conflict[] {
    return conflictsDatabase;
  }

  // Get all news articles
  static getAllNews(): NewsArticle[] {
    return newsDatabase;
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
  static getConflictDetails(conflictId: string): {
    conflict: Conflict | undefined;
    relatedNews: NewsArticle[];
  } {
    const conflict = getConflictById(conflictId);
    const relatedNews = getNewsForConflict(conflictId);

    return {
      conflict,
      relatedNews
    };
  }

  // Simulate API call for real-time updates
  static async fetchLatestConflictData(): Promise<{
    conflicts: Conflict[];
    news: NewsArticle[];
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, this would fetch from external APIs
    // like ACLED, Crisis Group, or NewsAPI
    return {
      conflicts: conflictsDatabase,
      news: newsDatabase
    };
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