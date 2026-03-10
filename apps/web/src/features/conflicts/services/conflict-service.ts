// Conflict Service — thin wrapper over conflict-api with formatting helpers

import * as api from './conflict-api';
export type { ConflictListFilters, EventFilters } from './conflict-api';

export class ConflictService {
  // ── Data fetching (delegates to api) ──

  static async getAllConflicts(filters?: api.ConflictListFilters) {
    return api.getConflicts(filters);
  }

  static async getConflictBySlug(slug: string) {
    return api.getConflictBySlug(slug);
  }

  static async getConflictEvents(slug: string, filters?: api.EventFilters) {
    return api.getConflictEvents(slug, filters);
  }

  static async getGlobalStats() {
    return api.getGlobalStats();
  }

  static async searchConflicts(q: string) {
    return api.searchConflicts(q);
  }

  static async getTimeline(slug: string, params?: Parameters<typeof api.getConflictTimeline>[1]) {
    return api.getConflictTimeline(slug, params);
  }

  static async getHeatmap(slug: string) {
    return api.getConflictHeatmap(slug);
  }

  // ── Formatting ──

  static formatFatalities(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  static statusLabel(status: string): string {
    const map: Record<string, string> = {
      WAR: 'War',
      WARM: 'Warm',
      IMPROVING: 'Improving',
      RESOLVED: 'Resolved',
      FROZEN: 'Frozen',
    };
    return map[status] || status;
  }

  static statusColor(status: string): string {
    const map: Record<string, string> = {
      WAR: '#ef4444',
      WARM: '#f59e0b',
      IMPROVING: '#22c55e',
      RESOLVED: '#6b7280',
      FROZEN: '#3b82f6',
    };
    return map[status] || '#6b7280';
  }

  static eventTypeColor(eventType: string): string {
    const map: Record<string, string> = {
      'Battles': '#ef4444',
      'Explosions/Remote violence': '#f97316',
      'Violence against civilians': '#dc2626',
      'Riots': '#eab308',
      'Protests': '#3b82f6',
      'Strategic developments': '#8b5cf6',
    };
    return map[eventType] || '#6b7280';
  }

  static interLabel(inter: number): string {
    const map: Record<number, string> = {
      1: 'State forces',
      2: 'Rebel forces',
      3: 'Political militia',
      4: 'Identity militia',
      5: 'Rioters',
      6: 'Protesters',
      7: 'Civilians',
      8: 'External/other',
    };
    return map[inter] || 'Unknown';
  }

  // ── Available filter options (ACLED regions) ──

  static getAvailableRegions(): string[] {
    return [
      'Western Africa', 'Middle Africa', 'Eastern Africa', 'Southern Africa', 'Northern Africa',
      'South Asia', 'Southeast Asia', 'East Asia',
      'Middle East',
      'Europe', 'Caucasus and Central Asia',
      'Central America', 'South America', 'Caribbean', 'North America',
      'Oceania',
    ];
  }

  static getAvailableStatuses(): string[] {
    return ['WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN'];
  }

  static getEventTypes(): string[] {
    return [
      'Battles',
      'Explosions/Remote violence',
      'Violence against civilians',
      'Riots',
      'Protests',
      'Strategic developments',
    ];
  }
}

export default ConflictService;
