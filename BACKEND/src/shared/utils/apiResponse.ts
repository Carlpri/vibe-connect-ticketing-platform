import { Response } from 'express';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: any;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Operation completed successfully',
  statusCode = 200
): Response => {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data: data !== undefined ? data : ({} as T),
    message,
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: any
): Response => {
  const payload: ApiErrorResponse = {
    success: false,
    message,
  };

  if (errors !== undefined && errors !== null) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};
