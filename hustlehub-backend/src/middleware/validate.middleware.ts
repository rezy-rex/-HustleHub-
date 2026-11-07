import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';
import { logEvent } from '../utils/logger';

export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues
          .map((e) => `${e.path.join('.') || 'body'}: ${e.message}`)
          .join('; ');
        logEvent('validation.failed', { fields: err.issues.map((item) => item.path.join('.') || 'body').slice(0, 20) }, 'warn');
        next(new AppError(`Validation failed — ${message}`, 400, 'VALIDATION_ERROR'));
        return;
      }
      next(err);
    }
  };
}