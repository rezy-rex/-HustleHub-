import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import { getPinoLogger, logEvent, runWithLogContext, setLogContext } from '../utils/logger';


// Configures the Pino HTTP adapter. Automatic request logging is disabled because
// the application emits its own completion event with request context below.
const httpLogger = pinoHttp({
  logger: getPinoLogger(),
  autoLogging: false,
  genReqId: () => crypto.randomUUID(),
});


// Assigns a request ID and records the completed HTTP request. The ID is returned
// to the caller and reused in AsyncLocalStorage so related logs can be correlated.
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  const startedAt = Date.now();
  const store = { requestId, ip: req.ip };


  httpLogger(req, res, () => {
    runWithLogContext(store, () => {
      // The finish event runs after the response is sent, so status and elapsed time
      // reflect the completed request rather than an intermediate state.
      res.once('finish', () => {
        runWithLogContext(store, () => {
          if (req.user) setLogContext({ userId: req.user.id });
          // Health checks are omitted to avoid flooding operational logs.
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
