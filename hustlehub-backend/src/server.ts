import https from 'https';
import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';
import { loadHttpsOptions } from './config/https';
import { connectDB } from './config/db';
import { flushLogs, logger, logEvent } from './utils/logger';

let httpServer: https.Server | undefined;
let shuttingDown = false;

async function startServer(): Promise<void> {
  const httpsOptions = loadHttpsOptions();
  await connectDB();

  httpServer = https.createServer(httpsOptions, app);
  httpServer.listen(env.PORT, '0.0.0.0', () => {
    logEvent('server.started', { host: '0.0.0.0', port: env.PORT, protocol: 'https' });
  });
}

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logEvent('server.shutdown', { signal });

  await new Promise<void>((resolve) => {
    if (!httpServer) return resolve();
    httpServer.close(() => resolve());
  });

  await mongoose.disconnect().catch((error: unknown) => {
    logger.error('MongoDB disconnect failed', error);
  });
  await flushLogs().catch((error: unknown) => {
    process.stderr.write(`[hustlehub-logger] Failed to flush logs: ${error instanceof Error ? error.message : String(error)}\n`);
  });
  process.exit(exitCode);
}

startServer().catch((error: unknown) => {
  logger.error('Application startup failed', error);
  void flushLogs().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  void shutdown('uncaughtException', 1);
});

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));