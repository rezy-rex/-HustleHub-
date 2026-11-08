import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { logEvent } from '../utils/logger';


// Handles unmatched routes and returns a predictable 404 response without exposing
// filesystem paths, stack traces, or other internal implementation details.
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
}


// Centralises API error responses so controllers and services can pass failures
// through one consistent boundary. Express recognises this as error-handling middleware specifically because
// it takes 4 arguments — `next` must stay in the signature even though it's
// only used implicitly (Express calls this instead of a route handler).
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required by the Express error middleware signature
export function errorMiddleware(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof AppError) {
    const level = err.statusCode >= 500 ? 'error' : err.statusCode >= 400 ? 'warn' : 'info';
    logEvent('error.application', {
      status: err.statusCode,
      code: err.code,
      method: req.method,
      path: req.path,
    }, level);
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
    return;
  }


  // Unexpected error — log full detail server-side only. The client never
  // sees a stack trace, file path, or internal configuration value.
  logEvent('error.unhandled', {
    method: req.method,
    path: req.path,
    err: err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) },
  }, 'error');
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
}
