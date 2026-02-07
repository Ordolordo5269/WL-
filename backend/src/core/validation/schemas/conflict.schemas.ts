import { z } from 'zod';
import { ConflictStatus } from '@prisma/client';
import { createValidationSchema, ValidationSchema } from '../validate';
import { idParamSchema, slugParamSchema, paginationSchema, coordinatesSchema } from './common';

/**
 * Schemas de validación para Conflict endpoints
 */

/**
 * Schema para crear un conflicto
 */
export const createConflictSchema: ValidationSchema = createValidationSchema({
  body: z.object({
    slug: z.string()
      .min(1, 'Slug is required')
      .max(200, 'Slug too long')
      .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers and hyphens'),
    
    name: z.string()
      .min(1, 'Name is required')
      .max(200, 'Name too long'),
    
    country: z.string()
      .min(2, 'Country is required')
      .max(100, 'Country name too long'),
    
    region: z.string()
      .min(2, 'Region is required')
      .max(100, 'Region name too long'),
    
    conflictType: z.string()
      .min(1, 'Conflict type is required')
      .max(100, 'Conflict type too long'),
    
    description: z.string()
      .min(10, 'Description must be at least 10 characters')
      .max(5000, 'Description too long'),
    
    status: z.nativeEnum(ConflictStatus, {
      message: 'Invalid status. Must be one of: WAR, WARM, IMPROVING, RESOLVED, FROZEN',
    }),
    
    startDate: z.string().datetime('Start date must be a valid ISO 8601 date'),
    
    escalationDate: z.string().datetime('Escalation date must be a valid ISO 8601 date').optional(),
    
    endDate: z.string().datetime('End date must be a valid ISO 8601 date').optional(),
    
    coordinates: coordinatesSchema,
    
    involvedISO: z.array(z.string().length(3, 'ISO codes must be 3 characters'))
      .optional()
      .default([]),
    
    sources: z.array(z.string().url('Sources must be valid URLs'))
      .optional()
      .default([]),
  }).refine(
    (data) => {
      // Validar que endDate sea después de startDate
      if (data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        return false;
      }
      // Validar que escalationDate sea después de startDate
      if (data.escalationDate && new Date(data.escalationDate) < new Date(data.startDate)) {
        return false;
      }
      return true;
    },
    {
      message: 'End date and escalation date must be after start date',
    }
  ),
});

/**
 * Schema para actualizar un conflicto
 */
export const updateConflictSchema: ValidationSchema = createValidationSchema({
  params: idParamSchema,
  body: z.object({
    slug: z.string()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    
    name: z.string()
      .min(1)
      .max(200)
      .optional(),
    
    country: z.string()
      .min(2)
      .max(100)
      .optional(),
    
    region: z.string()
      .min(2)
      .max(100)
      .optional(),
    
    conflictType: z.string()
      .min(1)
      .max(100)
      .optional(),
    
    description: z.string()
      .min(10)
      .max(5000)
      .optional(),
    
    status: z.nativeEnum(ConflictStatus).optional(),
    
    startDate: z.string().datetime().optional(),
    
    escalationDate: z.string().datetime().optional(),
    
    endDate: z.string().datetime().optional(),
    
    coordinates: coordinatesSchema.optional(),
    
    involvedISO: z.array(z.string().length(3)).optional(),
    
    sources: z.array(z.string().url()).optional(),
  }).refine(
    (data) => {
      // Si se proporcionan fechas, validar que sean consistentes
      if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        return false;
      }
      if (data.startDate && data.escalationDate && new Date(data.escalationDate) < new Date(data.startDate)) {
        return false;
      }
      return true;
    },
    {
      message: 'End date and escalation date must be after start date',
    }
  ),
});

/**
 * Schema para obtener conflictos con filtros
 */
export const getConflictsSchema: ValidationSchema = createValidationSchema({
  query: z.object({
    region: z.string().optional(),
    status: z.nativeEnum(ConflictStatus).optional(),
    country: z.string().optional(),
    conflictType: z.string().optional(),
    search: z.string().optional(),
    
    // Date filters
    startDateFrom: z.string().datetime().optional(),
    startDateTo: z.string().datetime().optional(),
    escalationDateFrom: z.string().datetime().optional(),
    escalationDateTo: z.string().datetime().optional(),
    activeOnly: z.enum(['true', 'false']).optional(),
    
    // Casualty filters
    casualtiesMin: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
    casualtiesMax: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
    
    // Sorting
    sortBy: z.enum(['startDate', 'name', 'casualties', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    
    // Pagination
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
});

/**
 * Schema para buscar conflictos
 */
export const searchConflictsSchema: ValidationSchema = createValidationSchema({
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(200),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  }),
});

/**
 * Schema para obtener conflicto por ID
 */
export const getConflictByIdSchema: ValidationSchema = createValidationSchema({
  params: idParamSchema,
});

/**
 * Schema para obtener conflicto por slug
 */
export const getConflictBySlugSchema: ValidationSchema = createValidationSchema({
  params: slugParamSchema,
});

/**
 * Schema para eliminar conflicto
 */
export const deleteConflictSchema: ValidationSchema = createValidationSchema({
  params: idParamSchema,
});

/**
 * Schema para obtener noticias de conflicto
 */
export const getConflictNewsSchema: ValidationSchema = createValidationSchema({
  params: idParamSchema,
  query: z.object({
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  }),
});

/**
 * Schema para cachear noticias de conflicto
 */
export const cacheConflictNewsSchema: ValidationSchema = createValidationSchema({
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
});

/**
 * Schema para eliminar noticia de conflicto
 */
export const deleteConflictNewsSchema: ValidationSchema = createValidationSchema({
  params: z.object({
    id: idParamSchema.shape.id,
    newsId: z.string().uuid('Invalid news ID format'),
  }),
});

