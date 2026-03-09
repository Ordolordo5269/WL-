import { z } from 'zod';

const bboxSchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
});

export const ucdpEventFiltersSchema = z.object({
  year: z.coerce.number().int().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  typeOfViolence: z.coerce.number().int().min(1).max(3).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  bbox: bboxSchema.optional(),
  limit: z.coerce.number().int().min(1).max(10000).default(1000),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ucdpConflictFiltersSchema = z.object({
  year: z.coerce.number().int().optional(),
  location: z.string().optional(),
  intensityLevel: z.coerce.number().int().optional(),
  typeOfConflict: z.coerce.number().int().optional(),
  region: z.coerce.number().int().min(1).max(5).optional(),
});

export const ucdpBattleDeathsFiltersSchema = z.object({
  year: z.coerce.number().int().optional(),
  conflictId: z.string().optional(),
  location: z.string().optional(),
});

export const ucdpNonStateFiltersSchema = z.object({
  year: z.coerce.number().int().optional(),
  location: z.string().optional(),
});

export const ucdpOneSidedFiltersSchema = z.object({
  year: z.coerce.number().int().optional(),
  location: z.string().optional(),
});

export const ucdpEventParamsSchema = z.object({
  id: z.coerce.number().int(),
});

export const ucdpConflictParamsSchema = z.object({
  conflictId: z.string().min(1),
});

export const ucdpSyncBodySchema = z.object({
  dataset: z.enum([
    'gedevents',
    'conflicts',
    'battledeaths',
    'nonstate',
    'onesided',
    'candidate',
    'all',
  ]),
  version: z.string().optional(),
});
