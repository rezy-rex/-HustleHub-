
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

type Role = 'client' | 'freelancer' | 'admin';

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError('Forbidden', 403, 'FORBIDDEN_ROLE'));
      return;
    }
    next();
  };
}
