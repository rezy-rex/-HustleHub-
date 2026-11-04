import { Request, Response, NextFunction } from 'express';

export const requestLogger = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};
