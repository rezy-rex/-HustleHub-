
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: 'hustlehub',
    });
    logger.info('MongoDB connected successfully to hustlehub database');
  } catch (err) {
    logger.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}
