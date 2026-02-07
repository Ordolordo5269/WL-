import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Crear directorio de logs si no existe
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

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

// Determinar nivel de log según entorno
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Logger principal de la aplicación
 * 
 * Niveles disponibles:
 * - error: Solo errores
 * - warn: Advertencias y errores
 * - info: Información general, advertencias y errores
 * - debug: Todo (solo en desarrollo)
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'worldlore-backend' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
      level: 'debug',
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  
  // Manejo de excepciones no capturadas
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
  
  // Manejo de promesas rechazadas
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    }),
  ],
});

/**
 * Helper para logging de requests HTTP
 */
export const logRequest = (req: any, res: any, duration: number) => {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    ...(req.user && { userId: req.user.id }),
  });
};

/**
 * Helper para logging de errores de API
 */
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

/**
 * Helper para logging de operaciones de base de datos
 */
export const logDatabaseOperation = (
  operation: string,
  details: {
    model?: string;
    duration?: number;
    [key: string]: any;
  }
) => {
  logger.debug('Database Operation', {
    operation,
    ...details,
  });
};

/**
 * Helper para logging de operaciones externas (APIs)
 */
export const logExternalApiCall = (
  service: string,
  endpoint: string,
  details: {
    method?: string;
    duration?: number;
    statusCode?: number;
    error?: string;
    [key: string]: any;
  }
) => {
  const level = details.error ? 'error' : 'info';
  logger[level](`External API Call: ${service}`, {
    endpoint,
    ...details,
  });
};






























