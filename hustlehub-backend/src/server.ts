import https from 'https';
import app from './app';
import { env } from './config/env';
import { loadHttpsOptions } from './config/https';
import { connectDB } from './config/db';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  const httpsOptions = loadHttpsOptions();

  await connectDB();

  https.createServer(httpsOptions, app).listen(env.PORT, () => {
    logger.info(`HustleHub+ API listening on https://localhost:${env.PORT}`);
  });
}

startServer();

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});