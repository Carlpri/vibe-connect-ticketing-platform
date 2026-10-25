import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { sendError } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest, TokenPayload, UserRole } from '../../shared/types';
import { prisma } from '../../shared/utils/prisma';

/**
 * Validates JWT Bearer token and attaches decoded payload to req.user.
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication token missing or invalid', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 'Invalid or expired token', 401);
  }
};

/**
 * Restricts access to specific user roles (e.g. ORGANIZER, ADMIN).
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Forbidden: Insufficient privileges', 403);
      return;
    }

    next();
  };
};

/**
 * Ensures user has verified their email address by inspecting persisted database state.
 */
export const requireEmailVerified = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { emailVerified: true },
  });

  if (!user || !user.emailVerified) {
    sendError(res, 'Email verification required to access this resource', 403);
    return;
  }

  next();
};

/**
 * Ensures user has verified their phone number by inspecting persisted database state.
 */
export const requirePhoneVerified = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { phoneVerified: true },
  });

  if (!user || !user.phoneVerified) {
    sendError(res, 'Phone number verification required to access this resource', 403);
    return;
  }

  next();
};

/**
 * Ensures a user has verified at least one contact method before purchasing tickets.
 */
export const requireAtLeastOneVerified = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { emailVerified: true, phoneVerified: true },
  });

  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }

  if (!user.emailVerified && !user.phoneVerified) {
    sendError(res, 'Email or phone verification required before purchasing tickets', 403);
    return;
  }

  next();
};

/**
 * Optional authentication middleware: if Authorization header is present and valid,
 * populates req.user. If absent or invalid, proceeds without error.
 */
export const optionalAuthenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = decoded;
  } catch {
    // Proceed unauthenticated if token is malformed/expired
  }
  next();
};

