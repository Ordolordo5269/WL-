/**
 * EJEMPLO DE IMPLEMENTACIÓN: Validación de Variables de Entorno
 * 
 * Este archivo muestra cómo debería implementarse env.ts
 * con validación usando Zod.
 * 
 * PASOS:
 * 1. npm install zod
 * 2. Copiar este contenido a backend/src/config/env.ts
 * 3. Ajustar el schema según tus necesidades
 * 4. Reemplazar todas las referencias a process.env por env.*
 */

import { z } from 'zod';

// Define el schema de validación
const envSchema = z.object({
  // Entorno
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Servidor
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3001'),
  
  // Base de datos
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // Seguridad
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // APIs externas
  MAPBOX_TOKEN: z.string().min(1, 'MAPBOX_TOKEN is required'),
  DEEPSEEK_API_KEY: z.string().optional(),
  
  // CORS
  CORS_ORIGIN: z.string().url().optional().or(z.literal('*')),
  
  // Redis (opcional)
  REDIS_URL: z.string().url().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Tipo inferido del schema
export type Env = z.infer<typeof envSchema>;

/**
 * Valida y parsea las variables de entorno
 * Falla si alguna variable requerida falta o es inválida
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n💡 Please check your .env file and ensure all required variables are set.');
      process.exit(1);
    }
    throw error;
  }
}

// Exporta el objeto env validado
export const env = validateEnv();

// Exporta valores individuales para compatibilidad
export const mapboxToken = env.MAPBOX_TOKEN;
export const databaseUrl = env.DATABASE_URL;
export const jwtSecret = env.JWT_SECRET;
export const port = env.PORT;
export const nodeEnv = env.NODE_ENV;






























