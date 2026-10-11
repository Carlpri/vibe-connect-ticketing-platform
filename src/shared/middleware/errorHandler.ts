import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Unhandled Application Error:', err);

  // Zod schema error
  if (err instanceof ZodError) {
    sendError(res, 'Validation error', 400, err.flatten().fieldErrors);
    return;
  }

  // Prisma known request error (e.g., unique constraint violation P2002)
  if (err?.code === 'P2002') {
    const target = err.meta?.target ? ` on field: ${err.meta.target}` : '';
    sendError(res, `A record with this value already exists${target}`, 409);
    return;
  }

  // Prisma record not found error (P2025)
  if (err?.code === 'P2025') {
    sendError(res, 'Record not found in database', 404);
    return;
  }

  const message = err.message || 'Internal server error';
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;

  sendError(res, message, statusCode);
};
