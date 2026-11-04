import crypto from 'crypto';

type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (level === 'error') {
    console.error(line, meta ?? '');
  } else if (level === 'warn') {
    console.warn(line, meta ?? '');
  } else {
    console.log(line, meta ?? '');
  }
}

// Part 1 scope: console output only. Part 3 extends this with structured,
// event-based logging (login attempts, bookings, transactions) per the
// DevSecOps rubric requirements.
export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};

export function logEvent(
  event: string,
  fields?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const payload = {
    time: new Date().toISOString(),
    level,
    event,
    message: typeof fields?.message === 'string' ? fields.message : event,
    ...fields,
  };
  process.stdout.write(JSON.stringify(payload) + '\n');
}

export function setLogContext(_fields: Record<string, unknown>): void {
  // no-op for now
}

export function hashEmail(email: string): string {
  return crypto
    .createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 16);
}
