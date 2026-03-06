import { Request, Response, NextFunction } from 'express';
import { logRequest } from '../core/logger';

/**
 * Middleware para logging de requests HTTP
 * Registra información sobre cada request: método, path, status code, duración, etc.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Interceptar el método end de response para calcular duración
  const originalEnd = res.end.bind(res);
  
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    logRequest(req, res, duration);
    
    // Restaurar método original y llamarlo
    res.end = originalEnd;
    return res.end(chunk, encoding, cb);
  };

  next();
}

