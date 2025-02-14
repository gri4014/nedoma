import { ZodError } from 'zod';

export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  TRANSACTION = 'TRANSACTION_ERROR',
  INTERNAL = 'INTERNAL_ERROR'
}

export interface ErrorResponse {
  type: ErrorType;
  message: string;
  field?: string;
  details?: any;
  code: string;
}

export class DbError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public details?: any,
    public field?: string
  ) {
    super(message);
    this.name = 'DbError';
  }
}

export function formatZodError(error: ZodError): ErrorResponse {
  const firstError = error.errors[0];
  return {
    type: ErrorType.VALIDATION,
    message: firstError.message,
    field: firstError.path.join('.'),
    details: error.errors,
    code: 'VALIDATION_001'
  };
}

export function formatDbError(error: any): ErrorResponse {
  // PostgreSQL unique violation
  if (error.code === '23505') {
    return {
      type: ErrorType.CONFLICT,
      message: 'A record with this value already exists',
      field: error.constraint,
      details: error,
      code: 'DB_001'
    };
  }

  // PostgreSQL foreign key violation
  if (error.code === '23503') {
    return {
      type: ErrorType.VALIDATION,
      message: 'Referenced record does not exist',
      field: error.constraint,
      details: error,
      code: 'DB_002'
    };
  }

  // PostgreSQL not null violation
  if (error.code === '23502') {
    return {
      type: ErrorType.VALIDATION,
      message: 'Required field is missing',
      field: error.column,
      details: error,
      code: 'DB_003'
    };
  }

  // Default database error
  return {
    type: ErrorType.DATABASE,
    message: error.message || 'Database operation failed',
    details: error,
    code: 'DB_999'
  };
}

export function handleError(error: any): ErrorResponse {
  if (error instanceof ZodError) {
    return formatZodError(error);
  }

  if (error instanceof DbError) {
    return {
      type: error.type,
      message: error.message,
      field: error.field,
      details: error.details,
      code: `${error.type}_001`
    };
  }

  if (error.code) {
    return formatDbError(error);
  }

  return {
    type: ErrorType.INTERNAL,
    message: error.message || 'An unexpected error occurred',
    details: error,
    code: 'INTERNAL_001'
  };
}
