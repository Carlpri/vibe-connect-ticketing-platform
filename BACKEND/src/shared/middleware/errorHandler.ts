import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/apiResponse';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

/**
 * Global Express error-handling middleware.
 * Catches all errors from synchronous and asynchronous routes,
 * logs detailed diagnostics server-side, and returns safe, standardized
 * client-facing JSON responses.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const method = req.method;
  const path = req.originalUrl;

  // 1. SyntaxError: Malformed JSON in request body
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    logger.warn('Malformed JSON payload received', {
      category: 'PARSER_ERROR',
      method,
      path,
      statusCode: 400,
    });
    sendError(res, 'Invalid JSON payload in request body', 400);
    return;
  }

  // 2. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.') || 'root',
      message: e.message,
    }));

    logger.warn('Request validation failed', {
      category: 'VALIDATION_ERROR',
      method,
      path,
      statusCode: 400,
      fieldCount: formattedErrors.length,
    });

    sendError(res, 'Validation failed', 400, formattedErrors);
    return;
  }

  // 3. Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g. duplicate email)
    if (err.code === 'P2002') {
      logger.warn('Unique constraint violation', {
        category: 'DATABASE_UNIQUE_VIOLATION',
        method,
        path,
        statusCode: 409,
        target: err.meta?.target,
      });
      sendError(res, 'A record with this information already exists', 409);
      return;
    }

    // Missing record (e.g. findUnique/update on non-existent ID)
    if (err.code === 'P2025') {
      logger.warn('Database record not found', {
        category: 'DATABASE_NOT_FOUND',
        method,
        path,
        statusCode: 404,
      });
      sendError(res, 'Resource not found', 404);
      return;
    }

    // Foreign key constraint violation
    if (err.code === 'P2003') {
      logger.warn('Foreign key constraint violation', {
        category: 'DATABASE_FK_VIOLATION',
        method,
        path,
        statusCode: 400,
        field: err.meta?.field_name,
      });
      sendError(res, 'Related resource not found or invalid reference', 400);
      return;
    }

    // Connection or pooler errors
    if (['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1017'].includes(err.code)) {
      logger.error('Database connectivity error', err, {
        category: 'DATABASE_CONNECTION_ERROR',
        method,
        path,
        statusCode: 500,
      });
      sendError(res, 'Database service unavailable. Please try again later.', 500);
      return;
    }

    // Generic known request error
    logger.error('Prisma known request error', err, {
      category: 'DATABASE_QUERY_ERROR',
      method,
      path,
      statusCode: 500,
    });
    sendError(res, 'A database error occurred while processing the request', 500);
    return;
  }

  // Database initialization / authentication errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error('Prisma initialization / database authentication failed', err, {
      category: 'DATABASE_INIT_ERROR',
      method,
      path,
      statusCode: 500,
    });
    sendError(res, 'Database service unavailable. Please try again later.', 500);
    return;
  }

  // Database validation error (bad query AST or schema mismatch)
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma client validation error', err, {
      category: 'DATABASE_VALIDATION_ERROR',
      method,
      path,
      statusCode: 400,
    });
    sendError(res, 'Invalid query data provided', 400);
    return;
  }

  // Database engine panic or unknown request error
  if (
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    logger.error('Prisma engine or unknown database error', err, {
      category: 'DATABASE_ENGINE_ERROR',
      method,
      path,
      statusCode: 500,
    });
    sendError(res, 'An unexpected database error occurred. Please try again later.', 500);
    return;
  }

  // 4. JWT / Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn('JWT verification failed', {
      category: 'AUTH_ERROR',
      method,
      path,
      statusCode: 401,
    });
    sendError(res, 'Invalid or expired token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    logger.warn('JWT token expired', {
      category: 'AUTH_ERROR',
      method,
      path,
      statusCode: 401,
    });
    sendError(res, 'Token has expired', 401);
    return;
  }

  // 5. Custom AppError instances
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, err, {
        category: 'APPLICATION_ERROR',
        method,
        path,
        statusCode: err.statusCode,
      });
      sendError(res, 'An unexpected internal server error occurred', err.statusCode);
    } else {
      logger.warn(err.message, {
        category: 'OPERATIONAL_ERROR',
        method,
        path,
        statusCode: err.statusCode,
      });
      sendError(res, err.message, err.statusCode, err.errors);
    }
    return;
  }

  // 6. Generic objects thrown with statusCode (e.g. { statusCode: 401, message: '...' })
  if (typeof err?.statusCode === 'number') {
    const status = err.statusCode;
    if (status >= 400 && status < 500) {
      logger.warn(err.message || 'Client error', {
        category: 'CLIENT_ERROR',
        method,
        path,
        statusCode: status,
      });
      sendError(res, err.message || 'Bad request', status, err.errors);
      return;
    }
  }

  // 7. Uncaught / Unexpected Server Errors (500)
  logger.error('Unhandled internal server exception', err, {
    category: 'UNHANDLED_EXCEPTION',
    method,
    path,
    statusCode: 500,
  });

  sendError(res, 'An unexpected internal server error occurred', 500);
};
