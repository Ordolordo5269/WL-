import { z, ZodSchema } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Schemas de validación para Auth endpoints
 */

/**
 * Schema para registro de usuario
 */
export const registerSchema: ValidationSchemas = {
  body: z.object({
    email: z.string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters')
      .max(255, 'Email too long')
      .transform((val) => val.toLowerCase().trim()),

    password: z.string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password too long'),

    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name too long')
      .optional(),
  }),
};

/**
 * Schema para login de usuario
 */
export const loginSchema: ValidationSchemas = {
  body: z.object({
    email: z.string()
      .email('Invalid email format')
      .transform((val) => val.toLowerCase().trim()),

    password: z.string()
      .min(1, 'Password is required'),
  }),
};
