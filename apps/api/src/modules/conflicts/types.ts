import { ConflictStatus } from '@prisma/client';

// ── Query filters ──

export interface ConflictListFilters {
  region?: string;
  status?: ConflictStatus;
  country?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EventFilters {
  eventType?: string;
  subEventType?: string;
  dateFrom?: string;   // YYYY-MM-DD — enables "last 30 days" filter
  dateTo?: string;     // YYYY-MM-DD
  actor?: string;
  minFatalities?: number;
  timePrecision?: number; // 1=exact, 2=approx, 3=estimated
  page?: number;
  limit?: number;
}

export interface TimelineParams {
  granularity?: 'day' | 'week' | 'month' | 'year';
  dateFrom?: string;
  dateTo?: string;
  eventType?: string;
}

// ── Create/seed data ──

export interface CreateConflictData {
  slug: string;
  name: string;
  country: string;
  region: string;
  description: string;
  status: ConflictStatus;
  filterCountry?: string;
  filterIso?: number;
  filterActors?: string[];
  filterDateFrom?: Date;
  filterDateTo?: Date;
  involvedISO: string[];
  coordinates: { lat: number; lng: number };
  startDate: Date;
  escalationDate?: Date;
  endDate?: Date;
  sources?: string[];
}
