import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ApiErrorResponse } from '../types/api';

/**
 * 404 Not Found handler for undefined routes.
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  const response: ApiErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  };
  res.status(404).json(response);
}

/**
 * Centralized API error handling middleware.
 * Ensures consistent response format: { error: { code, message, details? } }
 * Protects database credentials, connection strings, and internals from leaking.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Custom Application Errors (ValidationError, NotFoundError, ConflictError, etc.)
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // 2. Syntax Errors (e.g., malformed JSON in request body)
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    const response: ApiErrorResponse = {
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid JSON payload in request body',
      },
    };
    res.status(400).json(response);
    return;
  }

  // 3. Prisma Known Request Errors
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const prismaErr = err as { code: string; meta?: Record<string, unknown>; message: string };

    // P2002: Unique constraint violation
    if (prismaErr.code === 'P2002') {
      const target = Array.isArray(prismaErr.meta?.target)
        ? (prismaErr.meta.target as string[]).join(', ')
        : 'field';
      const response: ApiErrorResponse = {
        error: {
          code: 'CONFLICT',
          message: `A record with this ${target} already exists`,
        },
      };
      res.status(409).json(response);
      return;
    }

    // P2025: Record not found
    if (prismaErr.code === 'P2025') {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Requested record does not exist',
        },
      };
      res.status(404).json(response);
      return;
    }

    // P2003: Foreign key constraint violation
    if (prismaErr.code === 'P2003') {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Referenced entity does not exist or cannot be modified',
        },
      };
      res.status(400).json(response);
      return;
    }
  }

  // 4. Unhandled Internal Server Errors
  const genericError = err instanceof Error ? err : new Error(String(err));

  // Log error for diagnostics
  console.error('[Unhandled Server Error]', genericError);

  const message = isProduction
    ? 'An internal server error occurred'
    : genericError.message || 'An unexpected error occurred';

  const response: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  };

  res.status(500).json(response);
}
