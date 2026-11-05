// OWNER: Lesedi — REMOVE BEFORE COMMIT
import { describe, expect, it } from 'vitest';
import { formatPercent, formatZAR } from './currency';

describe('currency formatting', () => {
  it('formats South African rand values', () => {
    const formatted = formatZAR(1234.5);
    expect(formatted).toContain('R');
    expect(formatted).toContain('1');
    expect(formatted).toContain('234');
  });

  it('formats percentages from 0 to 1', () => {
    expect(formatPercent(0.26)).toBe('26.0%');
  });
});
