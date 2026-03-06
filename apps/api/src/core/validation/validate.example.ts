/**
 * EJEMPLO DE IMPLEMENTACIÓN: Middleware de Validación
 * 
 * Este middleware valida request body, query y params usando Zod.
 * 
 * PASOS:
 * 1. npm install zod
 * 2. Crear backend/src/core/validation/validate.ts con este contenido
 * 3. Usar en las rutas que necesiten validación
 * 
 * USO:
 * import { validate } from '../core/validation/validate';
 * import { z } from 'zod';
 * 
 * const createConflictSchema = z.object({
 *   body: z.object({
 *     name: z.string().min(1).max(200),
 *     status: z.enum(['WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN']),
 *   }),
 * });
 * 
 * router.post('/', validate(createConflictSchema), createConflict);
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Middleware de validación que valida body, query y params
 * 
 * @param schema - Schema de Zod que define la estructura esperada
 * @returns Middleware que valida el request
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valida body, query y params juntos
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

/**
 * Ejemplo de schemas comunes:
 */

// Schema para paginación
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  }),
});

// Schema para búsqueda
export const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1).max(200),
  }),
});

// Schema para ID en params
export const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
});

/**
 * Ejemplo de uso completo:
 * 
 * import { Router } from 'express';
 * import { z } from 'zod';
 * import { validate } from '../core/validation/validate';
 * import { createConflict } from '../controllers/conflict.controller';
 * 
 * const router = Router();
 * 
 * const createConflictSchema = z.object({
 *   body: z.object({
 *     name: z.string().min(1).max(200),
 *     country: z.string().min(2).max(100),
 *     region: z.string().min(2).max(100),
 *     conflictType: z.string().min(1),
 *     description: z.string().min(10).max(5000),
 *     status: z.enum(['WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN']),
 *     startDate: z.string().datetime(),
 *     coordinates: z.object({
 *       lat: z.number().min(-90).max(90),
 *       lng: z.number().min(-180).max(180),
 *     }),
 *     involvedISO: z.array(z.string().length(3)).optional(),
 *   }),
 * });
 * 
 * router.post('/', validate(createConflictSchema), createConflict);
 */






























