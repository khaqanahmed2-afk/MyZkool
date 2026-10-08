/**
 * Standard Error Handling Middleware
 * Source of Truth: docs/SPEC.md Section 4.6
 * Format: { code, message, details }
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

export function createApiError(code: string, message: string, statusCode: number = 400, details?: any): AppError {
  const error: AppError = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

export function apiErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Request payload validation failed.',
      details: (err.issues || (err as any).errors || []).map((e: any) => ({
        path: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
        message: e.message,
      })),
    });
  }

  // 2. Custom App / Plan / Permission Errors
  if (err.code) {
    let statusCode = err.statusCode || 400;
    if (err.code === 'PLAN_REQUIRED') statusCode = 402;
    if (err.code === 'FORBIDDEN') statusCode = 403;
    if (err.code === 'UNAUTHORIZED') statusCode = 401;
    if (err.code === 'NOT_FOUND') statusCode = 404;
    if (err.code === 'ACCOUNT_LOCKED' || err.code === 'IP_LOCKED') statusCode = 423;

    return res.status(statusCode).json({
      code: err.code,
      message: err.message || 'An error occurred processing the request.',
      details: err.details,
    });
  }

  // 3. Fallback Internal Server Error
  console.error('[ApiErrorHandler] Unhandled error:', err);
  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected internal error occurred. Please try again.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
