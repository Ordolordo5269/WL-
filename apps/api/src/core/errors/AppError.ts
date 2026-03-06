/**
 * Códigos de error estándar para la aplicación
 */
export enum ErrorCode {
  // Errores de validación (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Errores de autenticación (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Errores de autorización (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Errores de recurso no encontrado (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Errores de conflicto (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Errores del servidor (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Clase de error personalizada para la aplicación
 * Permite manejar errores de forma consistente con códigos y detalles
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    
    // Mantiene el stack trace correcto
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Factory methods para errores comunes
   */
  static notFound(message: string = 'Resource not found', details?: unknown): AppError {
    return new AppError(message, 404, ErrorCode.NOT_FOUND, details);
  }

  static badRequest(message: string = 'Bad request', details?: unknown): AppError {
    return new AppError(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }

  static unauthorized(message: string = 'Unauthorized', details?: unknown): AppError {
    return new AppError(message, 401, ErrorCode.UNAUTHORIZED, details);
  }

  static forbidden(message: string = 'Forbidden', details?: unknown): AppError {
    return new AppError(message, 403, ErrorCode.FORBIDDEN, details);
  }

  static conflict(message: string = 'Conflict', details?: unknown): AppError {
    return new AppError(message, 409, ErrorCode.CONFLICT, details);
  }

  static internal(message: string = 'Internal server error', details?: unknown): AppError {
    return new AppError(message, 500, ErrorCode.INTERNAL_ERROR, details, false);
  }
}






