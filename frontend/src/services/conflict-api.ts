// Conflict API Service
// Handles all API calls to the backend conflict endpoints

import type { Conflict } from '../src/types';
import { ErrorHandler } from '../src/utils/errorHandler';

export interface ConflictFilters {
  region?: string;
  status?: 'War' | 'Warm' | 'Improving';
  country?: string;
  conflictType?: string;
  search?: string;
  // Date filters
  startDateFrom?: string;
  startDateTo?: string;
  escalationDateFrom?: string;
  escalationDateTo?: string;
  activeOnly?: boolean;
  // Casualty filters
  casualtiesMin?: number;
  casualtiesMax?: number;
  // Sorting
  sortBy?: 'startDate' | 'name' | 'casualties' | 'status';
  sortOrder?: 'asc' | 'desc';
  // Pagination
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ConflictStats {
  total: number;
  byStatus: {
    WAR?: number;
    WARM?: number;
    IMPROVING?: number;
    RESOLVED?: number;
    FROZEN?: number;
  };
  byRegion: Array<{
    region: string;
    count: number;
  }>;
}

class ConflictAPIService {
  private static readonly BASE_URL = '/api/conflicts';
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for stats
  private static readonly SEARCH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for searches

  /**
   * Get cached data or fetch fresh
   */
  private static getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cache
   */
  private static setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all conflicts with optional filters (returns paginated response)
   */
  static async getAllConflicts(filters?: ConflictFilters): Promise<PaginatedResponse<Conflict>> {
    try {
      const cacheKey = `conflicts-${JSON.stringify(filters || {})}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const params = new URLSearchParams();
      
      // Basic filters
      if (filters?.region) params.append('region', filters.region);
      if (filters?.status) params.append('status', filters.status.toUpperCase());
      if (filters?.country) params.append('country', filters.country);
      if (filters?.conflictType) params.append('conflictType', filters.conflictType);
      if (filters?.search) params.append('search', filters.search);
      
      // Date filters
      if (filters?.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
      if (filters?.startDateTo) params.append('startDateTo', filters.startDateTo);
      if (filters?.escalationDateFrom) params.append('escalationDateFrom', filters.escalationDateFrom);
      if (filters?.escalationDateTo) params.append('escalationDateTo', filters.escalationDateTo);
      if (filters?.activeOnly) params.append('activeOnly', 'true');
      
      // Casualty filters
      if (filters?.casualtiesMin !== undefined) params.append('casualtiesMin', filters.casualtiesMin.toString());
      if (filters?.casualtiesMax !== undefined) params.append('casualtiesMax', filters.casualtiesMax.toString());
      
      // Sorting
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      // Pagination
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const url = `${this.BASE_URL}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch conflicts: ${response.status}`);
      }

      // Check if response is actually JSON (not HTML error page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Clone response to read text without consuming the body
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('Server returned HTML instead of JSON. Backend may not be running.');
        }
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      const data = await response.json();
      
      // Transform database format to frontend Conflict type
      const conflicts = this.transformConflicts(data.data || data); // Handle both paginated and non-paginated responses
      const result: PaginatedResponse<Conflict> = {
        data: conflicts,
        pagination: data.pagination || {
          page: 1,
          limit: conflicts.length,
          total: conflicts.length,
          totalPages: 1,
          hasMore: false
        }
      };
      
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      ErrorHandler.logAPIError('ConflictAPI', 'getAllConflicts', error);
      throw error;
    }
  }
  
  /**
   * Get all conflicts as array (backward compatibility - gets first page)
   */
  static async getAllConflictsArray(filters?: ConflictFilters): Promise<Conflict[]> {
    const result = await this.getAllConflicts(filters);
    return result.data;
  }

  /**
   * Get conflict by ID
   */
  static async getConflictById(id: string): Promise<Conflict | null> {
    try {
      const cacheKey = `conflict-${id}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await fetch(`${this.BASE_URL}/${id}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch conflict: ${response.status}`);
      }

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Clone response to read text without consuming the body
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('Server returned HTML instead of JSON. Backend may not be running.');
        }
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      const data = await response.json();
      const conflict = this.transformConflict(data);
      this.setCache(cacheKey, conflict);
      
      return conflict;
    } catch (error) {
      ErrorHandler.logAPIError('ConflictAPI', 'getConflictById', error);
      throw error;
    }
  }

  /**
   * Get conflict by slug
   */
  static async getConflictBySlug(slug: string): Promise<Conflict | null> {
    try {
      const cacheKey = `conflict-slug-${slug}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await fetch(`${this.BASE_URL}/slug/${slug}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch conflict: ${response.status}`);
      }

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Clone response to read text without consuming the body
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('Server returned HTML instead of JSON. Backend may not be running.');
        }
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      const data = await response.json();
      const conflict = this.transformConflict(data);
      this.setCache(cacheKey, conflict);
      
      return conflict;
    } catch (error) {
      ErrorHandler.logAPIError('ConflictAPI', 'getConflictBySlug', error);
      throw error;
    }
  }

  /**
   * Search conflicts (with shorter cache for freshness)
   */
  static async searchConflicts(query: string, limit: number = 20): Promise<Conflict[]> {
    try {
      const cacheKey = `conflicts-search-${query}-${limit}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_TTL) {
        return cached.data;
      }

      const response = await fetch(`${this.BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Failed to search conflicts: ${response.status}`);
      }

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Clone response to read text without consuming the body
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('Server returned HTML instead of JSON. Backend may not be running.');
        }
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      const data = await response.json();
      const conflicts = this.transformConflicts(data.results || []);
      this.cache.set(cacheKey, { data: conflicts, timestamp: Date.now() });
      
      return conflicts;
    } catch (error) {
      ErrorHandler.logAPIError('ConflictAPI', 'searchConflicts', error);
      throw error;
    }
  }

  /**
   * Get conflict statistics (with longer cache)
   */
  static async getConflictStats(): Promise<ConflictStats> {
    try {
      const cacheKey = 'conflicts-stats';
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.STATS_CACHE_TTL) {
        return cached.data;
      }

      const response = await fetch(`${this.BASE_URL}/stats`);

      if (!response.ok) {
        throw new Error(`Failed to fetch conflict stats: ${response.status}`);
      }

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Clone response to read text without consuming the body
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('Server returned HTML instead of JSON. Backend may not be running.');
        }
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      ErrorHandler.logAPIError('ConflictAPI', 'getConflictStats', error);
      throw error;
    }
  }

  /**
   * Transform database conflict format to frontend Conflict type
   */
  private static transformConflict(dbConflict: any): Conflict {
    // Calculate total casualties from casualty records
    const totalCasualties = dbConflict.casualties?.reduce((sum: number, c: any) => sum + (c.total || 0), 0) || 0;

    // Transform factions
    const factions: any = {};
    const alliesByFaction: any = {};
    
    if (dbConflict.factions) {
      for (const faction of dbConflict.factions) {
        factions[faction.name] = {
          allies: faction.allies || [],
          goals: faction.goals || [],
          militarySupport: {
            weapons: faction.support?.flatMap((s: any) => s.weapons || []) || [],
            aidValue: faction.support?.find((s: any) => s.aidValue)?.aidValue || undefined,
            strategicAssets: faction.support?.flatMap((s: any) => s.strategicAssets || []) || []
          }
        };

        // Build alliesByFaction from support records
        const isoCodes = faction.support?.map((s: any) => s.supporterISO).filter(Boolean) || [];
        if (isoCodes.length > 0) {
          alliesByFaction[faction.name] = {
            isoCodes,
            color: faction.color || '#000000'
          };
        }
      }
    }

    // Transform events
    const notableEvents = dbConflict.events?.map((e: any) => ({
      title: e.title,
      date: new Date(e.date).toISOString().split('T')[0]
    })) || [];

    // Get latest casualty breakdown
    const latestCasualty = dbConflict.casualties?.[0];
    const casualtiesDetailed = latestCasualty ? {
      military: latestCasualty.military ? { combined: latestCasualty.military } : undefined,
      civilian: latestCasualty.civilian ? { total: latestCasualty.civilian } : undefined
    } : undefined;

    return {
      id: dbConflict.slug || dbConflict.id,
      country: dbConflict.country,
      region: dbConflict.region,
      conflictType: dbConflict.conflictType,
      description: dbConflict.description,
      date: new Date(dbConflict.startDate).toISOString().split('T')[0],
      casualties: totalCasualties,
      status: this.mapStatus(dbConflict.status),
      coordinates: dbConflict.coordinates as { lat: number; lng: number },
      involvedISO: dbConflict.involvedISO || [],
      startDate: new Date(dbConflict.startDate).toISOString().split('T')[0],
      escalationDate: dbConflict.escalationDate ? new Date(dbConflict.escalationDate).toISOString().split('T')[0] : undefined,
      casualtiesDetailed,
      factions: Object.keys(factions).length > 0 ? factions : undefined,
      notableEvents: notableEvents.length > 0 ? notableEvents : undefined,
      alliesByFaction: Object.keys(alliesByFaction).length > 0 ? alliesByFaction : undefined,
      sources: dbConflict.sources || []
    };
  }

  /**
   * Transform array of conflicts
   */
  private static transformConflicts(dbConflicts: any[]): Conflict[] {
    return dbConflicts.map(c => this.transformConflict(c));
  }

  /**
   * Map database status to frontend status
   */
  private static mapStatus(dbStatus: string): 'War' | 'Warm' | 'Improving' {
    switch (dbStatus) {
      case 'WAR':
        return 'War';
      case 'WARM':
        return 'Warm';
      case 'IMPROVING':
        return 'Improving';
      case 'RESOLVED':
      case 'FROZEN':
        return 'Improving'; // Map resolved/frozen to Improving for now
      default:
        return 'War';
    }
  }
}

export default ConflictAPIService;

