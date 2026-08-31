import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { fileUserRepository, User } from './user.repository';

const SALT_ROUNDS = 12;

function sanitize(user: User) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export const authService = {
  async register(email: string, password: string, role: 'client' | 'freelancer') {
    const existing = await fileUserRepository.findByEmail(email);
    if (existing) {
      throw new AppError('Email is already registered', 409, 'AUTH_EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await fileUserRepository.create({ email, passwordHash, role });
    return sanitize(user);
  },

  async login(email: string, password: string) {
    const user = await fileUserRepository.findByEmail(email);

    // Same generic error whether the email doesn't exist or the password is
    // wrong — prevents this endpoint being used to enumerate registered
    // email addresses.
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError('Invalid email or password', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const signOptions: jwt.SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    };
    const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, signOptions);

    return { token, user: sanitize(user) };
  },

  async getById(id: string) {
    const user = await fileUserRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return sanitize(user);
  },
};