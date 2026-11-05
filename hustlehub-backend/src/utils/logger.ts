// OWNER: Odirile — REMOVE BEFORE COMMIT
import crypto from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import pino, { DestinationStream, Logger as PinoLogger } from 'pino';
import { env } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error';
interface LogContext { [key: string]: unknown }

const logStorage = new AsyncLocalStorage<LogContext>();

function currentContext(): LogContext {
  return logStorage.getStore() ?? {};
}

export function setLogContext(fields: Record<string, unknown>): void {
  const store = logStorage.getStore();
  if (store) Object.assign(store, fields);
}

export function runWithLogContext<T>(fields: LogContext, callback: () => T): T {
  return logStorage.run(fields, callback);
}

function createMeta(meta: unknown): Record<string, unknown> | undefined {
  if (meta instanceof Error) {
    return { error: { message: meta.message, stack: meta.stack } };
  }
  return meta && typeof meta === 'object' ? meta as Record<string, unknown> : undefined;
}

function redactForCapture(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactForCapture);
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/^(password|passwordHash|token|authorization)$/i.test(key) || key.endsWith('.password') || key.endsWith('.passwordHash') || key.endsWith('.token')) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactForCapture(child);
    }
  }
  return result;
}

export function createLogger(destination?: DestinationStream): {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
} {
  let pinoDestination: DestinationStream | undefined = destination;

  if (!pinoDestination) {
    if (env.AXIOM_TOKEN && env.AXIOM_DATASET) {
      try {
        const axiomOptions: Record<string, unknown> = {
          dataset: env.AXIOM_DATASET,
          token: env.AXIOM_TOKEN,
          axiomClient: 'hustlehub-api/1.0',
          onError: (_error: Error) => undefined,
        };
        if (env.AXIOM_URL) {
          axiomOptions.url = env.AXIOM_URL;
          axiomOptions.edgeUrl = env.AXIOM_URL;
        }
        const transport = pino.transport({
          targets: [
            { target: 'pino/file', options: { destination: 1 } },
            { target: '@axiomhq/pino', options: axiomOptions },
          ],
        });
        transport.on?.('error', () => undefined);
        pinoDestination = transport;
      } catch {
        pinoDestination = pino.destination(1);
      }
    } else {
      pinoDestination = pino.destination(1);
    }
  }

  const root = pino(
    {
      level: env.LOG_LEVEL,
      base: { service: 'hustlehub-api', env: env.NODE_ENV },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label: string) => ({ level: label }) },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'password',
          'passwordHash',
          'token',
          'authorization',
          '*.password',
          '*.passwordHash',
          '*.token',
        ],
        censor: '[REDACTED]',
      },
    },
    pinoDestination
  );

  function write(level: LogLevel, message: string, meta?: unknown): void {
    const context = currentContext();
    const normalizedMeta = createMeta(meta);
    const payload = { ...context, ...(normalizedMeta ?? {}) };
    if (destination) {
      const line = {
        level,
        time: new Date().toISOString(),
        service: 'hustlehub-api',
        env: env.NODE_ENV,
        ...redactForCapture(payload) as Record<string, unknown>,
        msg: message,
      };
      destination.write(JSON.stringify(line));
      return;
    }
    if (Object.keys(payload).length > 0) root[level](payload, message);
    else root[level](message);
  }

  const created = {
    info: (message: string, meta?: unknown) => write('info', message, meta),
    warn: (message: string, meta?: unknown) => write('warn', message, meta),
    error: (message: string, meta?: unknown) => write('error', message, meta),
  };

  if (!env.AXIOM_TOKEN || !env.AXIOM_DATASET) {
    created.info('Axiom log shipping is disabled');
  }
  activeLogger = created;
  return created;
}

let activeLogger: ReturnType<typeof createLogger>;
activeLogger = createLogger();
export const logger = activeLogger;

let rootLogger: PinoLogger | undefined;
export function getPinoLogger(): PinoLogger {
  if (!rootLogger) {
    let destination: DestinationStream | undefined;
    if (!destination) destination = pino.destination(1);
    rootLogger = pino({
      level: env.LOG_LEVEL,
      base: { service: 'hustlehub-api', env: env.NODE_ENV },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label: string) => ({ level: label }) },
      redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash', 'token', 'authorization', '*.password', '*.passwordHash', '*.token'], censor: '[REDACTED]' },
    }, destination);
  }
  return rootLogger;
}

export function logEvent(
  event: string,
  fields?: Record<string, unknown>,
  level: LogLevel = 'info'
): void {
  activeLogger[level](event, { ...currentContext(), ...fields });
}

export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 16);
}
