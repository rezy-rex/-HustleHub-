import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import { getPinoLogger, logEvent, runWithLogContext, setLogContext } from '../utils/logger';

const httpLogger = pinoHttp({
  logger: getPinoLogger(),
  autoLogging: false,
  genReqId: () => crypto.randomUUID(),
});

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  const startedAt = Date.now();
  const store = { requestId, ip: req.ip };

  httpLogger(req, res, () => {
    runWithLogContext(store, () => {
      res.once('finish', () => {
        runWithLogContext(store, () => {
          if (req.user) setLogContext({ userId: req.user.id });
          if (req.method === 'GET' && req.path === '/health') return;
          const status = res.statusCode;
          const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
          logEvent('http.request', {
            method: req.method,
            path: req.path,
            status,
            durationMs: Date.now() - startedAt,
          }, level);
        });
      });
      next();
    });
  });
};
