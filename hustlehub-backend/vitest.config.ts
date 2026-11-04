import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test_jwt_secret_with_more_than_forty_characters_long_for_security',
      MONGODB_URI: 'mongodb://localhost:27017/hustlehub-test',
      LOG_LEVEL: 'silent',
    },
  },
});
