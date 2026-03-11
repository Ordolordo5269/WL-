// Russian Warship API Service
// Source: https://russianwarship.rip/api/v2
// Provides daily statistics on Russian military losses in Ukraine

export interface WarshipDailyStats {
  date: string;
  day: number;
  stats: {
    personnel_units: number;
    tanks: number;
    armoured_fighting_vehicles: number;
    artillery_systems: number;
    mlrs: number;
    aa_warfare_systems: number;
    planes: number;
    helicopters: number;
    vehicles_fuel_tanks: number;
    warships_cutters: number;
    cruise_missiles: number;
    uav_systems: number;
    special_military_equip: number;
    atgm_srbm_systems: number;
    submarines: number;
  };
  increase: {
    personnel_units: number;
    tanks: number;
    armoured_fighting_vehicles: number;
    artillery_systems: number;
    mlrs: number;
    aa_warfare_systems: number;
    planes: number;
    helicopters: number;
    vehicles_fuel_tanks: number;
    warships_cutters: number;
    cruise_missiles: number;
    uav_systems: number;
    special_military_equip: number;
    atgm_srbm_systems: number;
    submarines: number;
  };
}

export interface WarshipLatestResponse {
  message: string;
  data: WarshipDailyStats;
}

export interface WarshipPaginatedResponse {
  message: string;
  data: {
    records: WarshipDailyStats[];
    total: number;
  };
}

export interface WarshipTerm {
  title: string;
  description: string;
  icon: string;
}

export interface WarshipTermsResponse {
  message: string;
  data: Record<string, WarshipTerm>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class RussianWarshipAPI {
  private static readonly BASE_URL = 'https://russianwarship.rip/api/v2';
  private static cache = new Map<string, CacheEntry<unknown>>();
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour (data updates daily)
  private static readonly STATS_CACHE_TTL = 30 * 60 * 1000; // 30 min for latest

  private static getCached<T>(key: string, ttl: number): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttl) {
      return entry.data as T;
    }
    return null;
  }

  private static setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Fetch latest Russian losses statistics
   */
  static async getLatestStats(): Promise<WarshipDailyStats> {
    const cacheKey = 'latest';
    const cached = this.getCached<WarshipDailyStats>(cacheKey, this.STATS_CACHE_TTL);
    if (cached) return cached;

    const response = await fetch(`${this.BASE_URL}/statistics/latest`);
    if (!response.ok) {
      throw new Error(`RussianWarship API error: ${response.status}`);
    }

    const result: WarshipLatestResponse = await response.json();
    this.setCache(cacheKey, result.data);
    return result.data;
  }

  /**
   * Fetch statistics for a specific date (YYYY-MM-DD)
   */
  static async getStatsByDate(date: string): Promise<WarshipDailyStats> {
    const cacheKey = `stats-${date}`;
    const cached = this.getCached<WarshipDailyStats>(cacheKey, this.CACHE_TTL);
    if (cached) return cached;

    const response = await fetch(`${this.BASE_URL}/statistics/${date}`);
    if (!response.ok) {
      throw new Error(`RussianWarship API error: ${response.status}`);
    }

    const result: WarshipLatestResponse = await response.json();
    this.setCache(cacheKey, result.data);
    return result.data;
  }

  /**
   * Fetch statistics for a date range
   */
  static async getStatsRange(
    dateFrom: string,
    dateTo: string,
    limit: number = 30
  ): Promise<WarshipDailyStats[]> {
    const cacheKey = `range-${dateFrom}-${dateTo}-${limit}`;
    const cached = this.getCached<WarshipDailyStats[]>(cacheKey, this.CACHE_TTL);
    if (cached) return cached;

    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      offset: '0',
      limit: String(Math.min(limit, 50)),
    });

    const response = await fetch(`${this.BASE_URL}/statistics?${params}`);
    if (!response.ok) {
      throw new Error(`RussianWarship API error: ${response.status}`);
    }

    const result: WarshipPaginatedResponse = await response.json();
    this.setCache(cacheKey, result.data.records);
    return result.data.records;
  }

  /**
   * Fetch equipment term definitions with icons
   */
  static async getTerms(lang: 'en' | 'ua' = 'en'): Promise<Record<string, WarshipTerm>> {
    const cacheKey = `terms-${lang}`;
    const cached = this.getCached<Record<string, WarshipTerm>>(cacheKey, this.CACHE_TTL);
    if (cached) return cached;

    const response = await fetch(`${this.BASE_URL}/terms/${lang}`);
    if (!response.ok) {
      throw new Error(`RussianWarship API error: ${response.status}`);
    }

    const result: WarshipTermsResponse = await response.json();
    this.setCache(cacheKey, result.data);
    return result.data;
  }

  /**
   * Get a summary with the most relevant loss data formatted for display
   */
  static async getLossesSummary(): Promise<{
    date: string;
    dayOfWar: number;
    personnel: number;
    personnelIncrease: number;
    topLosses: Array<{ category: string; total: number; increase: number }>;
  }> {
    const stats = await this.getLatestStats();

    const categoryLabels: Record<string, string> = {
      personnel_units: 'Personnel',
      tanks: 'Tanks',
      armoured_fighting_vehicles: 'AFVs',
      artillery_systems: 'Artillery',
      mlrs: 'MLRS',
      aa_warfare_systems: 'AA Systems',
      planes: 'Planes',
      helicopters: 'Helicopters',
      vehicles_fuel_tanks: 'Vehicles',
      warships_cutters: 'Warships',
      cruise_missiles: 'Cruise Missiles',
      uav_systems: 'UAVs',
      special_military_equip: 'Special Equipment',
      atgm_srbm_systems: 'ATGM/SRBM',
      submarines: 'Submarines',
    };

    const topLosses = Object.entries(stats.stats)
      .filter(([key]) => key !== 'personnel_units')
      .map(([key, total]) => ({
        category: categoryLabels[key] || key,
        total,
        increase: stats.increase[key as keyof typeof stats.increase] || 0,
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      date: stats.date,
      dayOfWar: stats.day,
      personnel: stats.stats.personnel_units,
      personnelIncrease: stats.increase.personnel_units,
      topLosses,
    };
  }

  static clearCache(): void {
    this.cache.clear();
  }
}
