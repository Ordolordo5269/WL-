import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  logger.error({ err, method: req.method, path: req.path }, 'Unhandled error');

  // Never expose stack traces to the client
  if (!_res.headersSent) {
    _res.status(500).json({
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  } else {
    // Headers already sent — log and swallow, do NOT re-throw
    logger.warn({ err, method: req.method, path: req.path }, 'Error after headers sent — swallowed');
  }
}
