import { z } from 'zod';
import { ConflictStatus } from '@prisma/client';

const conflictStatusEnum = z.enum(['WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN']);

// ── V2 schemas (existing) ──

export const conflictFiltersSchema = z.object({
  region: z.string().optional(),
  status: conflictStatusEnum.optional(),
  country: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const conflictParamsSchema = z.object({
  slug: z.string().min(1),
});

// ── Common schemas ──

const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

const slugParamSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers and hyphens'),
});

const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ── CRUD schemas ──

interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

export const createConflictSchema: ValidationSchemas = {
  body: z.object({
    slug: z.string().min(1, 'Slug is required').max(200, 'Slug too long')
      .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers and hyphens'),
    name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
    country: z.string().min(2, 'Country is required').max(100, 'Country name too long'),
    region: z.string().min(2, 'Region is required').max(100, 'Region name too long'),
    conflictType: z.string().min(1, 'Conflict type is required').max(100, 'Conflict type too long'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
    status: z.nativeEnum(ConflictStatus, {
      message: 'Invalid status. Must be one of: WAR, WARM, IMPROVING, RESOLVED, FROZEN',
    }),
    startDate: z.string().datetime('Start date must be a valid ISO 8601 date'),
    escalationDate: z.string().datetime('Escalation date must be a valid ISO 8601 date').optional(),
    endDate: z.string().datetime('End date must be a valid ISO 8601 date').optional(),
    coordinates: coordinatesSchema,
    involvedISO: z.array(z.string().length(3, 'ISO codes must be 3 characters')).optional().default([]),
    sources: z.array(z.string().url('Sources must be valid URLs')).optional().default([]),
  }).refine(
    (data) => {
      if (data.endDate && new Date(data.endDate) < new Date(data.startDate)) return false;
      if (data.escalationDate && new Date(data.escalationDate) < new Date(data.startDate)) return false;
      return true;
    },
    { message: 'End date and escalation date must be after start date' }
  ),
};

export const updateConflictSchema: ValidationSchemas = {
  params: idParamSchema,
  body: z.object({
    slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
    name: z.string().min(1).max(200).optional(),
    country: z.string().min(2).max(100).optional(),
    region: z.string().min(2).max(100).optional(),
    conflictType: z.string().min(1).max(100).optional(),
    description: z.string().min(10).max(5000).optional(),
    status: z.nativeEnum(ConflictStatus).optional(),
    startDate: z.string().datetime().optional(),
    escalationDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    coordinates: coordinatesSchema.optional(),
    involvedISO: z.array(z.string().length(3)).optional(),
    sources: z.array(z.string().url()).optional(),
  }).refine(
    (data) => {
      if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) return false;
      if (data.startDate && data.escalationDate && new Date(data.escalationDate) < new Date(data.startDate)) return false;
      return true;
    },
    { message: 'End date and escalation date must be after start date' }
  ),
};

export const getConflictsSchema: ValidationSchemas = {
  query: z.object({
    region: z.string().optional(),
    status: z.nativeEnum(ConflictStatus).optional(),
    country: z.string().optional(),
    conflictType: z.string().optional(),
    search: z.string().optional(),
    startDateFrom: z.string().datetime().optional(),
    startDateTo: z.string().datetime().optional(),
    escalationDateFrom: z.string().datetime().optional(),
    escalationDateTo: z.string().datetime().optional(),
    activeOnly: z.enum(['true', 'false']).optional(),
    casualtiesMin: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
    casualtiesMax: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
    sortBy: z.enum(['startDate', 'name', 'casualties', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    ...paginationSchema.shape,
  }).refine(
    (data) => {
      if (data.casualtiesMin !== undefined && data.casualtiesMax !== undefined) {
        return data.casualtiesMin <= data.casualtiesMax;
      }
      return true;
    },
    { message: 'casualtiesMin must be less than or equal to casualtiesMax' }
  ),
};

export const searchConflictsSchema: ValidationSchemas = {
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(200),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  }),
};

export const getConflictByIdSchema: ValidationSchemas = {
  params: idParamSchema,
};

export const getConflictBySlugSchema: ValidationSchemas = {
  params: slugParamSchema,
};

export const deleteConflictSchema: ValidationSchemas = {
  params: idParamSchema,
};

export const getConflictNewsSchema: ValidationSchemas = {
  params: idParamSchema,
  query: z.object({
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  }),
};

export const cacheConflictNewsSchema: ValidationSchemas = {
  params: idParamSchema,
  body: z.object({
    articles: z.array(z.object({
      title: z.string().min(1),
      source: z.string().min(1),
      url: z.string().url(),
      publishedAt: z.string().datetime(),
      description: z.string().optional(),
      imageUrl: z.string().url().optional(),
    })).min(1, 'At least one article is required'),
  }),
};

export const deleteConflictNewsSchema: ValidationSchemas = {
  params: z.object({
    id: idParamSchema.shape.id,
    newsId: z.string().uuid('Invalid news ID format'),
  }),
};
