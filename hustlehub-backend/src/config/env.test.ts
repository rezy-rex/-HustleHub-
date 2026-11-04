import { describe, it, expect } from 'vitest';
import { env, envSchema } from './env';

describe('env configuration', () => {
  it('asserts the loaded env defaults parse correctly', () => {
    expect(env.LOGIN_MAX_FAILURES).toBe(3);
    expect(env.LOCKOUT_MINUTES).toBe(15);
    expect(env.TRUST_PROXY).toBe(0);
    expect(Array.isArray(env.CORS_ORIGINS)).toBe(true);
    expect(env.CORS_ORIGINS).toContain('http://localhost:5173');
  });

  it('asserts schema defaults parse expected values', () => {
    const parsed = envSchema.parse({
      JWT_SECRET: 'test_jwt_secret_with_more_than_thirty_two_characters',
      MONGODB_URI: 'mongodb://localhost:27017/hustlehub-test',
    });

    expect(parsed.LOGIN_MAX_FAILURES).toBe(3);
    expect(parsed.LOCKOUT_MINUTES).toBe(15);
    expect(parsed.TRUST_PROXY).toBe(0);
    expect(Array.isArray(parsed.CORS_ORIGINS)).toBe(true);
    expect(parsed.CORS_ORIGINS).toContain('http://localhost:5173');
  });
});
