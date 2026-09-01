import https from 'https';
import app from './app';
import { env } from './config/env';
import { loadHttpsOptions } from './config/https';
import { logger } from './utils/logger';

const httpsOptions = loadHttpsOptions();

https.createServer(httpsOptions, app).listen(env.PORT, () => {
  logger.info(`HustleHub+ API listening on https://localhost:${env.PORT}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});