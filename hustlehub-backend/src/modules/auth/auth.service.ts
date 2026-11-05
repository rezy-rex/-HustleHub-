// OWNER: Sixolile — REMOVE BEFORE COMMIT
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { hashEmail, logEvent } from '../../utils/logger';
import { userRepository, User } from './user.repository';

const SALT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-not-used-for-login', 4);

function sanitize(user: User) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function invalidCredentials(): AppError {
  return new AppError('Invalid email or password', 401, 'AUTH_INVALID_CREDENTIALS');
}

export const authService = {
  async register(email: string, password: string, role: 'client' | 'freelancer') {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('Email is already registered', 409, 'AUTH_EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepository.create({ email, passwordHash, role });
    logEvent('auth.register.success', { userId: user.id, role: user.role }, 'info');
    return sanitize(user);
  },

  async login(email: string, password: string) {
    let user = await userRepository.findByEmail(email);
    const emailHash = hashEmail(email);

    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      logEvent('auth.login.failed', { reason: 'unknown_email', emailHash }, 'warn');
      throw invalidCredentials();
    }

    if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      // Deliberately identical to the wrong-password response so the client cannot enumerate or distinguish locked accounts.
      logEvent('auth.login.failed', { reason: 'account_locked', userId: user.id, emailHash }, 'warn');
      throw invalidCredentials();
    }

    if (user.lockUntil && new Date(user.lockUntil).getTime() <= Date.now()) {
      await userRepository.resetLoginFailures(user.id);
      user = { ...user, failedLoginAttempts: 0, lockUntil: null };
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      const updated = await userRepository.registerFailedLogin(
        user.id,
        env.LOGIN_MAX_FAILURES,
        env.LOCKOUT_MINUTES
      );
      logEvent('auth.login.failed', { reason: 'bad_password', userId: user.id, emailHash }, 'warn');
      if (updated?.lockUntil && new Date(updated.lockUntil).getTime() > Date.now()) {
        logEvent('auth.account.locked', {
          userId: user.id,
          emailHash,
          failedAttempts: updated.failedLoginAttempts,
          lockMinutes: env.LOCKOUT_MINUTES,
        }, 'warn');
      }
      throw invalidCredentials();
    }

    if (user.failedLoginAttempts > 0) {
      await userRepository.resetLoginFailures(user.id);
    }

    const signOptions: jwt.SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    };
    const token = jwt.sign(
      { sub: user.id, role: user.role, tv: user.tokenVersion },
      env.JWT_SECRET,
      signOptions
    );
    logEvent('auth.login.success', { userId: user.id, role: user.role }, 'info');

    return { token, user: sanitize(user) };
  },

  async logout(userId: string) {
    await userRepository.bumpTokenVersion(userId);
    // Bumping the version invalidates every token that user holds, on every device.
    logEvent('auth.logout', { userId }, 'info');
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return sanitize(user);
  },
};