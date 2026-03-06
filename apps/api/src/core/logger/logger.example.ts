/**
 * EJEMPLO DE IMPLEMENTACIÓN: Logger Estructurado con Winston
 * 
 * Este logger reemplaza console.log/console.error con logging estructurado.
 * 
 * PASOS:
 * 1. npm install winston
 * 2. Crear directorio: mkdir -p backend/logs
 * 3. Crear backend/src/core/logger/index.ts con este contenido
 * 4. Reemplazar console.log por logger en todo el código
 * 
 * USO:
 * import { logger } from '../core/logger';
 * 
 * logger.info('Server started', { port: 3001 });
 * logger.error('Database error', { error: err.message, query: 'getAllCountries' });
 */

import winston from 'winston';
import path from 'path';
import { env } from '../../config/env';

// Configuración de formatos
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Crear el logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'worldlore-backend' },
  transports: [
    // Console output (solo en desarrollo)
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' ? logFormat : consoleFormat,
      level: 'debug',
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  
  // Manejo de excepciones no capturadas
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
    }),
  ],
  
  // Manejo de promesas rechazadas
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
    }),
  ],
});

/**
 * Ejemplos de uso:
 * 
 * // Info log
 * logger.info('Server started', { port: env.PORT, env: env.NODE_ENV });
 * 
 * // Error log con contexto
 * logger.error('Database query failed', {
 *   error: err.message,
 *   query: 'getAllCountries',
 *   duration: 150,
 *   userId: req.user?.id,
 * });
 * 
 * // Warning log
 * logger.warn('Cache miss', { key: 'countries:all', ttl: 3600 });
 * 
 * // Debug log (solo en desarrollo)
 * logger.debug('Request received', {
 *   method: req.method,
 *   path: req.path,
 *   query: req.query,
 * });
 * 
 * // Con stack trace automático
 * try {
 *   throw new Error('Something went wrong');
 * } catch (error) {
 *   logger.error('Operation failed', { error }); // Incluye stack trace
 * }
 */

// Helper para logging de requests HTTP
export const logRequest = (req: Request, res: Response, duration: number) => {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

// Helper para logging de errores de API
export const logApiError = (
  error: Error,
  context: {
    method?: string;
    path?: string;
    userId?: string;
    [key: string]: any;
  }
) => {
  logger.error('API Error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  });
};






























