import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from '../errors/AppError';

/**
 * Tipo para schemas de validación que pueden validar body, query y params
 */
export type ValidationSchema = z.ZodObject<{
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}>;

/**
 * Middleware de validación que valida body, query y params usando Zod
 * 
 * @param schema - Schema de Zod que define la estructura esperada
 * @returns Middleware que valida el request
 * 
 * @example
 * const createConflictSchema = z.object({
 *   body: z.object({
 *     name: z.string().min(1).max(200),
 *     status: z.enum(['WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN']),
 *   }),
 * });
 * 
 * router.post('/', validate(createConflictSchema), createConflict);
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Construir objeto a validar
      const dataToValidate: any = {};
      
      if (schema.shape.body) {
        dataToValidate.body = req.body;
      }
      if (schema.shape.query) {
        dataToValidate.query = req.query;
      }
      if (schema.shape.params) {
        dataToValidate.params = req.params;
      }

      // Validar
      const result = schema.parse(dataToValidate);

      // Asignar valores validados de vuelta al request
      if (result.body) {
        req.body = result.body;
      }
      if (result.query) {
        req.query = result.query as any;
      }
      if (result.params) {
        req.params = result.params as any;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));

        throw AppError.badRequest('Validation error', {
          errors: details,
          received: {
            body: req.body,
            query: req.query,
            params: req.params,
          },
        });
      }
      next(error);
    }
  };
};

/**
 * Helper para crear schemas de validación más fácilmente
 */
export const createValidationSchema = (config: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}): ValidationSchema => {
  const shape: any = {};
  if (config.body) shape.body = config.body;
  if (config.query) shape.query = config.query;
  if (config.params) shape.params = config.params;

  return z.object(shape) as ValidationSchema;
};

