import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logEvent, setLogContext } from '../utils/logger';
import { userRepository } from '../modules/auth/user.repository';

interface AccessTokenPayload {
  sub: string;
  role: 'client' | 'freelancer' | 'admin';
  tv?: number;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next(new AppError('Missing authentication token', 401, 'AUTH_NO_TOKEN'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    } catch {
      throw new AppError('Invalid or expired token', 401, 'AUTH_INVALID_TOKEN');
    }

    // This trade-off accepts one database read per authenticated request so every token can be revoked immediately.
    const user = await userRepository.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) {
      logEvent('auth.token.revoked', { userId: payload.sub }, 'warn');
      throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED');
    }

    req.user = { id: payload.sub, role: payload.role };
    setLogContext({ userId: payload.sub, role: payload.role });
    next();
  } catch (err) {
    next(err);
  }
}
