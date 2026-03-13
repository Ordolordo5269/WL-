import { z } from 'zod';
import { ConflictStatus } from '@prisma/client';

// ── Conflict list filters ──

export const conflictListFiltersSchema = z.object({
  region: z.string().optional(),
  status: z.nativeEnum(ConflictStatus).optional(),
  country: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

// ── Slug param ──

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
});

// ── Event filters (for /conflicts/:slug/events) ──

export const eventFiltersSchema = z.object({
  eventType: z.string().optional(),
  subEventType: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  actor: z.string().optional(),
  minFatalities: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
  timePrecision: z.string().transform(Number).pipe(z.number().int().min(1).max(3)).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(500)).optional(),
});

// ── Timeline params ──

export const timelineParamsSchema = z.object({
  granularity: z.enum(['day', 'week', 'month', 'year']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eventType: z.string().optional(),
});

// ── Search ──

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

// ── Sync trigger ──

export const syncParamsSchema = z.object({
  slug: z.string().min(1).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
