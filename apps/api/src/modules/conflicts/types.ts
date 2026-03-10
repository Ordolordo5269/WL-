import { z } from 'zod';
import type { conflictFiltersSchema, conflictParamsSchema } from './schemas.js';
import { ConflictStatus } from '@prisma/client';

export type ConflictFilters = z.infer<typeof conflictFiltersSchema>;
export type ConflictParams = z.infer<typeof conflictParamsSchema>;

export interface LegacyConflictFilters {
  region?: string;
  status?: ConflictStatus;
  country?: string;
  conflictType?: string;
  search?: string;
  startDateFrom?: Date | string;
  startDateTo?: Date | string;
  escalationDateFrom?: Date | string;
  escalationDateTo?: Date | string;
  activeOnly?: boolean;
  casualtiesMin?: number;
  casualtiesMax?: number;
  sortBy?: 'startDate' | 'name' | 'casualties' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateConflictData {
  slug: string;
  name: string;
  country: string;
  region: string;
  conflictType: string;
  description: string;
  status: ConflictStatus;
  startDate: Date;
  escalationDate?: Date;
  endDate?: Date;
  coordinates: { lat: number; lng: number };
  involvedISO: string[];
  sources?: string[];
}
