// OWNER: Sixolile — REMOVE BEFORE COMMIT
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  registerFailedLogin: vi.fn(),
  resetLoginFailures: vi.fn(),
  bumpTokenVersion: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
  hashSync: vi.fn(),
  sign: vi.fn(),
  logEvent: vi.fn(),
  hashEmail: vi.fn(),
}));

vi.mock('./user.repository', () => ({
  userRepository: {
    findByEmail: mocks.findByEmail,
    findById: mocks.findById,
    create: mocks.create,
    registerFailedLogin: mocks.registerFailedLogin,
    resetLoginFailures: mocks.resetLoginFailures,
    bumpTokenVersion: mocks.bumpTokenVersion,
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: mocks.compare,
    hash: mocks.hash,
    hashSync: mocks.hashSync,
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign: mocks.sign },
}));

vi.mock('../../utils/logger', () => ({
  logEvent: mocks.logEvent,
  hashEmail: mocks.hashEmail,
  setLogContext: vi.fn(),
}));

import { env } from '../../config/env';
import { authService } from './auth.service';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    passwordHash: 'hash',
    role: 'client' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    tokenVersion: 2,
    failedLoginAttempts: 0,
    lockUntil: null,
    ...overrides,
  };
}

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashSync.mockReturnValue('$2b$04$dummy');
    mocks.hashEmail.mockImplementation((email: string) => `hash-${email}`);
    mocks.hash.mockResolvedValue('new-hash');
    mocks.sign.mockReturnValue('signed-token');
    mocks.resetLoginFailures.mockResolvedValue(undefined);
    mocks.bumpTokenVersion.mockResolvedValue(3);
  });

  it('uses a dummy bcrypt comparison for an unknown email and throws a generic 401', async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.compare.mockResolvedValue(false);

    await expect(authService.login('missing@example.com', 'password')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    expect(mocks.compare).toHaveBeenCalledTimes(1);
  });

  it('registers a wrong-password failure with the environment thresholds and throws generic 401', async () => {
    const user = makeUser();
    mocks.findByEmail.mockResolvedValue(user);
    mocks.compare.mockResolvedValue(false);
    mocks.registerFailedLogin.mockResolvedValue({ ...user, failedLoginAttempts: 1, lockUntil: null });

    await expect(authService.login(user.email, 'wrong')).rejects.toMatchObject({
      message: 'Invalid email or password',
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    expect(mocks.registerFailedLogin).toHaveBeenCalledWith(user.id, env.LOGIN_MAX_FAILURES, env.LOCKOUT_MINUTES);
  });

  it('logs auth.account.locked when the failure reaches the lock threshold', async () => {
    const user = makeUser();
    mocks.findByEmail.mockResolvedValue(user);
    mocks.compare.mockResolvedValue(false);
    mocks.registerFailedLogin.mockResolvedValue({
      ...user,
      failedLoginAttempts: env.LOGIN_MAX_FAILURES,
      lockUntil: new Date(Date.now() + env.LOCKOUT_MINUTES * 60_000).toISOString(),
    });

    await expect(authService.login(user.email, 'wrong')).rejects.toBeInstanceOf(Error);
    expect(mocks.logEvent).toHaveBeenCalledWith(
      'auth.account.locked',
      expect.objectContaining({ userId: user.id, failedAttempts: env.LOGIN_MAX_FAILURES }),
      'warn'
    );
  });

  it('returns the identical generic 401 for a locked account with the correct password without resetting', async () => {
    const wrongUser = makeUser();
    const lockedUser = makeUser({ lockUntil: new Date(Date.now() + 60_000).toISOString() });
    mocks.compare.mockResolvedValue(false);
    mocks.findByEmail.mockResolvedValueOnce(wrongUser);
    mocks.registerFailedLogin.mockResolvedValue({ ...wrongUser, lockUntil: null });
    let wrongError: Error | undefined;
    let lockedError: Error | undefined;
    try { await authService.login(wrongUser.email, 'wrong'); } catch (error) { wrongError = error as Error; }

    mocks.compare.mockResolvedValue(true);
    mocks.findByEmail.mockResolvedValueOnce(lockedUser);
    try { await authService.login(lockedUser.email, 'correct'); } catch (error) { lockedError = error as Error; }

    expect(lockedError?.message).toBe(wrongError?.message);
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.resetLoginFailures).not.toHaveBeenCalled();
  });

  it('resets an expired lock before a successful login', async () => {
    const user = makeUser({ failedLoginAttempts: 2, lockUntil: new Date(Date.now() - 60_000).toISOString() });
    mocks.findByEmail.mockResolvedValue(user);
    mocks.compare.mockResolvedValue(true);

    await expect(authService.login(user.email, 'correct')).resolves.toMatchObject({ token: 'signed-token' });
    expect(mocks.resetLoginFailures).toHaveBeenCalledWith(user.id);
  });

  it('signs tv from the user and resets failures only when attempts are greater than zero', async () => {
    const user = makeUser({ failedLoginAttempts: 1 });
    mocks.findByEmail.mockResolvedValue(user);
    mocks.compare.mockResolvedValue(true);

    await authService.login(user.email, 'correct');
    expect(mocks.sign).toHaveBeenCalledWith(
      { sub: user.id, role: user.role, tv: user.tokenVersion },
      expect.any(String),
      expect.any(Object)
    );
    expect(mocks.resetLoginFailures).toHaveBeenCalledWith(user.id);
  });

  it('logout bumps the token version and logs auth.logout', async () => {
    await authService.logout('user-1');
    expect(mocks.bumpTokenVersion).toHaveBeenCalledWith('user-1');
    expect(mocks.logEvent).toHaveBeenCalledWith('auth.logout', { userId: 'user-1' }, 'info');
  });
});