// OWNER: Odirile — REMOVE BEFORE COMMIT
import { Request, Response, NextFunction } from 'express';
import { logEvent } from '../utils/logger';
import { AppError } from '../utils/AppError';

type Role = 'client' | 'freelancer' | 'admin';

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      logEvent('authz.denied', {
        reason: 'role',
        required: roles,
        actual: req.user?.role,
        method: req.method,
        path: req.path,
      }, 'warn');
      next(new AppError('Forbidden', 403, 'FORBIDDEN_ROLE'));
      return;
    }
    next();
  };
}
