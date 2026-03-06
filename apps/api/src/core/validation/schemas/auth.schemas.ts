import { z } from 'zod';
import { createValidationSchema, ValidationSchema } from '../validate';

/**
 * Schemas de validación para Auth endpoints
 */

/**
 * Schema para registro de usuario
 */
export const registerSchema: ValidationSchema = createValidationSchema({
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
});

/**
 * Schema para login de usuario
 */
export const loginSchema: ValidationSchema = createValidationSchema({
  body: z.object({
    email: z.string()
      .email('Invalid email format')
      .transform((val) => val.toLowerCase().trim()),
    
    password: z.string()
      .min(1, 'Password is required'),
  }),
});

