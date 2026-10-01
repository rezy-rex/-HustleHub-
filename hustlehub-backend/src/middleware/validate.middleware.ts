import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors
          .map((e) => `${e.path.join('.') || 'body'}: ${e.message}`)
          .join('; ');
        next(new AppError(`Validation failed — ${message}`, 400, 'VALIDATION_ERROR'));
        return;
      }
      next(err);
    }
  };
}