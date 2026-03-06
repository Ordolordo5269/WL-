import { NextFunction, Request, Response } from 'express';
import { AppError, ErrorCode } from './AppError';
import { Prisma } from '@prisma/client';
import { logger, logApiError } from '../logger';

/**
 * Maneja errores de Prisma y los convierte a AppError
 */
function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      const target = (err.meta?.target as string[]) || [];
      return AppError.conflict(
        `Duplicate entry: ${target.join(', ')} already exists`,
        { field: target, code: err.code }
      );
    
    case 'P2025':
      // Record not found
      return AppError.notFound('Record not found', { code: err.code });
    
    case 'P2003':
      // Foreign key constraint violation
      return AppError.badRequest(
        'Foreign key constraint violation',
        { code: err.code, meta: err.meta }
      );
    
    case 'P2014':
      // Required relation violation
      return AppError.badRequest(
        'Required relation violation',
        { code: err.code, meta: err.meta }
      );
    
    default:
      return AppError.internal(
        'Database error',
        { code: err.code, meta: err.meta }
      );
  }
}

/**
 * Maneja errores de Prisma desconocidos
 */
function handlePrismaUnknownError(err: Prisma.PrismaClientUnknownRequestError): AppError {
  return AppError.internal('Database error', { message: err.message });
}

/**
 * Maneja errores de validación de Prisma
 */
function handlePrismaValidationError(err: Prisma.PrismaClientValidationError): AppError {
  return AppError.badRequest('Invalid database query', { message: err.message });
}

/**
 * Middleware centralizado de manejo de errores
 * Debe ser el último middleware en la cadena
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log del error para debugging
  const errorDetails = {
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString(),
  };

  // Manejar errores de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const appError = handlePrismaError(err);
    logApiError(err as Error, {
      ...errorDetails,
      prismaCode: err.code,
      errorType: 'PrismaKnownError',
    });
    return res.status(appError.statusCode).json({
      error: appError.message,
      code: appError.code,
      details: appError.details,
    });
  }

  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const appError = handlePrismaUnknownError(err);
    logApiError(err as Error, {
      ...errorDetails,
      errorType: 'PrismaUnknownError',
    });
    return res.status(appError.statusCode).json({
      error: appError.message,
      code: appError.code,
      details: appError.details,
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    const appError = handlePrismaValidationError(err);
    logApiError(err as Error, {
      ...errorDetails,
      errorType: 'PrismaValidationError',
    });
    return res.status(appError.statusCode).json({
      error: appError.message,
      code: appError.code,
      details: appError.details,
    });
  }

  // Manejar AppError personalizado
  if (err instanceof AppError) {
    // Solo loggear errores no operacionales o en desarrollo
    if (!err.isOperational || process.env.NODE_ENV === 'development') {
      logger.warn('App Error', {
        ...errorDetails,
        code: err.code,
        error: err.message,
        details: err.details,
      });
    }
    
    const response: any = {
      error: err.message,
      code: err.code,
    };
    
    if (err.details) {
      response.details = err.details;
    }
    
    return res.status(err.statusCode).json(response);
  }

  // Manejar errores estándar de JavaScript
  if (err instanceof Error) {
    logApiError(err, errorDetails);
    
    // En producción, no exponer detalles del error
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

    return res.status(500).json({
      error: message,
      code: ErrorCode.INTERNAL_ERROR,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Manejar errores desconocidos
  logger.error('Unknown Error', {
    ...errorDetails,
    error: err,
  });

  return res.status(500).json({
    error: 'Unexpected error occurred',
    code: ErrorCode.INTERNAL_ERROR,
  });
}






