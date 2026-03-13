// ACLED Conflict API Service
// Handles all API calls to the ACLED-driven backend

import type { AcledConflict, AcledEvent } from '../../../types';

const BASE = '/api/conflicts';

// ── Response types ──

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  pagination: { page: number; limit: number; total: number };
}

export interface ConflictDetail extends AcledConflict {
  recentEvents: AcledEvent[];
}

export interface GlobalStats {
  totalConflicts: number;
  totalEvents: number;
  totalFatalities: number;
  byStatus: Array<{ status: string; count: number }>;
  byRegion: Array<{ region: string; count: number }>;
  byEventType: Array<{ eventType: string; count: number; fatalities: number }>;
}

export interface TimelinePoint {
  period: string;
  events: number;
  fatalities: number;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  fatalities: number;
  eventType: string;
  eventDate: string;
}

// ── Filters ──

export interface ConflictListFilters {
  region?: string;
  status?: string;
  country?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EventFilters {
  eventType?: string;
  subEventType?: string;
  dateFrom?: string;
  dateTo?: string;
  actor?: string;
  minFatalities?: number;
  timePrecision?: number;
  page?: number;
  limit?: number;
}

// ── Helper ──

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function buildParams(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') {
      params.set(k, String(v));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

// ── API calls ──

export async function getConflicts(
  filters?: ConflictListFilters
): Promise<PaginatedResponse<AcledConflict>> {
  return fetchJSON(`${BASE}${buildParams(filters || {})}`);
}

export async function getConflictBySlug(slug: string): Promise<ConflictDetail | null> {
  try {
    const res = await fetchJSON<{ data: ConflictDetail }>(`${BASE}/${slug}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getConflictEvents(
  slug: string,
  filters?: EventFilters
): Promise<PaginatedResponse<AcledEvent>> {
  return fetchJSON(`${BASE}/${slug}/events${buildParams(filters || {})}`);
}

export async function getConflictHeatmap(slug: string): Promise<HeatmapPoint[]> {
  const res = await fetchJSON<{ data: HeatmapPoint[] }>(`${BASE}/${slug}/heatmap`);
  return res.data;
}

export async function getConflictTimeline(
  slug: string,
  params?: { granularity?: string; dateFrom?: string; dateTo?: string; eventType?: string }
): Promise<TimelinePoint[]> {
  const res = await fetchJSON<{ data: TimelinePoint[] }>(
    `${BASE}/${slug}/timeline${buildParams(params || {})}`
  );
  return res.data;
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const res = await fetchJSON<{ data: GlobalStats }>(`${BASE}/stats`);
  return res.data;
}

export async function searchConflicts(q: string, limit = 20): Promise<AcledConflict[]> {
  const res = await fetchJSON<{ data: AcledConflict[] }>(
    `${BASE}/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  return res.data;
}

export async function triggerSync(slug?: string): Promise<any> {
  const url = slug ? `${BASE}/${slug}/sync` : `${BASE}/sync`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  return res.json();
}
