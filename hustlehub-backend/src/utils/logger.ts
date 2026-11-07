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
    if (/^(password|passwordHash|token|authorization|apiKey|api_key)$/i.test(key)
      || key.endsWith('.password') || key.endsWith('.passwordHash') || key.endsWith('.token')) {
      // eslint-disable-next-line security/detect-object-injection -- key is derived from Object.entries
      result[key] = '[REDACTED]';
    } else {
      // eslint-disable-next-line security/detect-object-injection -- key is derived from Object.entries
      result[key] = redactForCapture(child);
    }
  }
  return result;
}

export interface StructuredLogger {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
}

let activeLogger: StructuredLogger;
let activeRoot: PinoLogger;

export function createLogger(destination?: DestinationStream): StructuredLogger {
  let pinoDestination: DestinationStream | undefined = destination;

  if (!pinoDestination) {
    const stdout = pino.destination(1);
    if (env.AXIOM_TOKEN && env.AXIOM_DATASET) {
      try {
        const axiomOptions: Record<string, unknown> = {
          dataset: env.AXIOM_DATASET,
          token: env.AXIOM_TOKEN,
          axiomClient: 'hustlehub-api/1.0',
        };
        if (env.AXIOM_URL) axiomOptions.url = env.AXIOM_URL;
        const transport = pino.transport({
          targets: [
            { target: 'pino/file', options: { destination: 1 } },
            { target: '@axiomhq/pino', options: axiomOptions },
          ],
        });
        transport.on('error', (error: Error) => {
          process.stderr.write(`[hustlehub-logger] Axiom transport error: ${error.message}\n`);
        });
        pinoDestination = transport;
      } catch (error) {
        process.stderr.write(`[hustlehub-logger] Axiom transport initialization failed: ${error instanceof Error ? error.message : String(error)}\n`);
        pinoDestination = stdout;
      }
    } else {
      pinoDestination = stdout;
    }
  }

  const options = {
    level: env.LOG_LEVEL || 'info',
    base: { service: 'hustlehub-api', env: env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Keep numeric Pino levels so multi-target transports such as Axiom map levels correctly.
    redact: {
      paths: [
        'req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash',
        'token', 'authorization', 'apiKey', 'api_key', 'mongodb_uri', 'MONGODB_URI',
        '*.password', '*.passwordHash', '*.token', '*.apiKey', '*.api_key',
      ],
      censor: '[REDACTED]',
    },
  };

  const root = pino(options, pinoDestination);
  activeRoot = root;

  function write(level: LogLevel, message: string, meta?: unknown): void {
    const payload = { ...currentContext(), ...(createMeta(meta) ?? {}) };
    if (destination) {
      const line = {
        level,
        time: new Date().toISOString(),
        service: 'hustlehub-api',
        env: env.NODE_ENV,
        ...redactForCapture(payload) as Record<string, unknown>,
        msg: message,
      };
      destination.write(`${JSON.stringify(line)}\n`);
      return;
    }
    // eslint-disable-next-line security/detect-object-injection -- level is constrained to LogLevel
    if (Object.keys(payload).length > 0) root[level](payload, message);
    // eslint-disable-next-line security/detect-object-injection -- level is constrained to LogLevel
    else root[level](message);
  }

  const created: StructuredLogger = {
    info: (message: string, meta?: unknown) => write('info', message, meta),
    warn: (message: string, meta?: unknown) => write('warn', message, meta),
    error: (message: string, meta?: unknown) => write('error', message, meta),
  };

  activeLogger = created;
  if (!destination && (!env.AXIOM_TOKEN || !env.AXIOM_DATASET)) {
    created.info('Axiom log shipping disabled: AXIOM_TOKEN or AXIOM_DATASET is not configured');
  }
  return created;
}

activeLogger = createLogger();
export const logger = activeLogger;

export function getPinoLogger(): PinoLogger {
  return activeRoot;
}

export function flushLogs(): Promise<void> {
  return new Promise((resolve, reject) => {
    activeRoot.flush((error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function logEvent(
  event: string,
  fields?: Record<string, unknown>,
  level: LogLevel = 'info'
): void {
  const payload = { ...currentContext(), event, ...(fields ?? {}) };
  if (level === 'error') activeLogger.error(event, payload);
  else if (level === 'warn') activeLogger.warn(event, payload);
  else activeLogger.info(event, payload);
}

export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 16);
}
