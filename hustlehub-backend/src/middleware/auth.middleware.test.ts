import { describe, expect, it, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  logEvent: vi.fn(),
  setLogContext: vi.fn(),
}));

vi.mock('../modules/auth/user.repository', () => ({
  userRepository: { findById: mocks.findById },
}));

vi.mock('../utils/logger', () => ({
  logEvent: mocks.logEvent,
  setLogContext: mocks.setLogContext,
  hashEmail: vi.fn(),
}));

import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { authMiddleware } from './auth.middleware';

function request(auth?: string): Request {
  return { headers: auth ? { authorization: auth } : {} } as Request;
}

const next = vi.fn() as NextFunction;
const response = {} as Response;

function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a missing header with AUTH_NO_TOKEN', async () => {
    await authMiddleware(request(), response, next);
    const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
    expect(error.code).toBe('AUTH_NO_TOKEN');
  });

  it('rejects a garbage token with AUTH_INVALID_TOKEN', async () => {
    await authMiddleware(request('Bearer garbage-token'), response, next);
    const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
    expect(error.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('accepts a matching token version and sets req.user', async () => {
    mocks.findById.mockResolvedValue({
      id: 'user-1', tokenVersion: 4, role: 'client', email: 'user@example.com',
      passwordHash: 'hash', createdAt: '2026-01-01T00:00:00.000Z', failedLoginAttempts: 0, lockUntil: null,
    });
    const req = request(`Bearer ${signToken({ sub: 'user-1', role: 'client', tv: 4 })}`);

    await authMiddleware(req, response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-1', role: 'client' });
    expect(mocks.setLogContext).toHaveBeenCalledWith({ userId: 'user-1', role: 'client' });
  });

  it('rejects mismatched token versions with TOKEN_REVOKED', async () => {
    mocks.findById.mockResolvedValue({ id: 'user-1', tokenVersion: 5, role: 'client' });
    const req = request(`Bearer ${signToken({ sub: 'user-1', role: 'client', tv: 4 })}`);

    await authMiddleware(req, response, next);
    const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
    expect(error.code).toBe('TOKEN_REVOKED');
  });

  it('rejects an unknown user with TOKEN_REVOKED', async () => {
    mocks.findById.mockResolvedValue(null);
    const req = request(`Bearer ${signToken({ sub: 'missing-user', role: 'client', tv: 0 })}`);

    await authMiddleware(req, response, next);
    const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
    expect(error.code).toBe('TOKEN_REVOKED');
  });

  it('passes repository errors to next unchanged', async () => {
    const repositoryError = new Error('database unavailable');
    mocks.findById.mockRejectedValue(repositoryError);
    const req = request(`Bearer ${signToken({ sub: 'user-1', role: 'client', tv: 0 })}`);

    await authMiddleware(req, response, next);
    expect(next).toHaveBeenCalledWith(repositoryError);
  });
});