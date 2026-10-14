import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

const formatZodErrors = (error: ZodError) => {
  return error.errors.map((e) => ({
    field: e.path.join('.') || 'root',
    message: e.message,
  }));
};

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        sendError(res, 'Validation failed', 400, formatZodErrors(error));
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        sendError(res, 'Validation failed on query parameters', 400, formatZodErrors(error));
        return;
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        sendError(res, 'Validation failed on path parameters', 400, formatZodErrors(error));
        return;
      }
      next(error);
    }
  };
};
