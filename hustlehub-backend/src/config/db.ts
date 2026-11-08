
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

const DB_CONNECT_ATTEMPTS = 10;
const DB_RETRY_DELAY_MS = 3000;

export async function connectDB(): Promise<void> {
  for (let attempt = 1; attempt <= DB_CONNECT_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        dbName: 'hustlehub',
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('MongoDB connected successfully to hustlehub database');
      return;
    } catch (error) {
      logger.warn('MongoDB connection attempt failed', {
        attempt,
        maxAttempts: DB_CONNECT_ATTEMPTS,
        retrying: attempt < DB_CONNECT_ATTEMPTS,
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt === DB_CONNECT_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, DB_RETRY_DELAY_MS));
    }
  }
}
