import { z } from 'zod';

/**
 * Schemas de validación comunes reutilizables
 */

/**
 * Schema para paginación
 */
export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
});

/**
 * Schema para búsqueda
 */
export const searchSchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').max(200, 'Search query too long'),
});

/**
 * Schema para ID en params (UUID)
 */
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

/**
 * Schema para slug en params
 */
export const slugParamSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers and hyphens'),
});

/**
 * Schema para código ISO de país (2 o 3 caracteres)
 */
export const isoCodeSchema = z.string().length(2).or(z.string().length(3));

/**
 * Schema para coordenadas geográficas
 */
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Schema para fechas (ISO 8601)
 */
export const dateSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

/**
 * Schema para rango de fechas
 */
export const dateRangeSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
}).refine(
  (data) => {
    if (!data.from || !data.to) return true;
    return new Date(data.from) <= new Date(data.to);
  },
  { message: 'From date must be before or equal to to date' }
);

/**
 * Schema para ordenamiento
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});






























