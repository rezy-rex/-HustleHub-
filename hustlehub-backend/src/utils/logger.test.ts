// OWNER: Odirile — REMOVE BEFORE COMMIT
import { Writable } from 'stream';
import { describe, expect, it } from 'vitest';
import { createLogger, hashEmail, logEvent, runWithLogContext } from './logger';

class MemoryDestination extends Writable {
  output = '';
  override _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.output += chunk.toString();
    callback();
  }
}

describe('structured logger', () => {
  it('redacts secrets and authorization headers', async () => {
    const destination = new MemoryDestination();
    const memoryLogger = createLogger(destination);
    memoryLogger.info('Secret check', {
      password: 'secret-password',
      passwordHash: 'secret-hash',
      token: 'secret-token',
      req: { headers: { authorization: 'Bearer secret' } },
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(destination.output).not.toContain('secret-password');
    expect(destination.output).not.toContain('secret-hash');
    expect(destination.output).not.toContain('secret-token');
    expect(destination.output).not.toContain('Bearer secret');
    expect(destination.output).toContain('[REDACTED]');
  });

  it('hashes emails consistently without exposing the original email', () => {
    const first = hashEmail('  Mpho@HustleHub.com ');
    const second = hashEmail('mpho@hustlehub.com');
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{16}$/);
    expect(first).not.toContain('mpho');
  });

  it('adds requestId inside a context and is safe outside one', async () => {
    const destination = new MemoryDestination();
    const memoryLogger = createLogger(destination);
    void memoryLogger;
    runWithLogContext({ requestId: 'test-request-id' }, () => {
      logEvent('context.test', { result: 'ok' });
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(destination.output + '').toContain('test-request-id');
    expect(() => logEvent('outside.context')).not.toThrow();
  });

  it('creates a logger when Axiom configuration is absent', () => {
    const destination = new MemoryDestination();
    expect(() => createLogger(destination)).not.toThrow();
  });
});
