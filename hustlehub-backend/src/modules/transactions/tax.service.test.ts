import { describe, expect, it } from 'vitest';
import { buildTaxSummary, calculateTax, getTaxYear } from './tax.service';


// Regression tests cover tax arithmetic, bracket transitions, tax-year boundaries
// and the monthly aggregation used by the freelancer tax summary.
describe('tax service', () => {
  // Check representative incomes against expected outputs from the configured table.
  it('calculates required tax vectors', () => {
    expect(calculateTax(0, 2026).tax).toBe(0);
    expect(calculateTax(99000, 2026).tax).toBe(0);
    expect(calculateTax(99001, 2026).tax).toBe(0.18);
    expect(calculateTax(245100, 2026).tax).toBe(26298);
    expect(calculateTax(400000, 2026).tax).toBe(67417);
    expect(calculateTax(1000000, 2026).tax).toBe(288293);
  });


  // Ensure values on either side of a threshold select the expected marginal rate.
  it('uses the correct bracket at boundaries and for the top bracket', () => {
    expect(calculateTax(245100, 2026).bracketIndex).toBe(0);
    expect(calculateTax(245100, 2026).marginalRate).toBe(0.18);
    expect(calculateTax(245101, 2026).bracketIndex).toBe(1);
    expect(calculateTax(245101, 2026).marginalRate).toBe(0.26);
    expect(calculateTax(2000000, 2026).nextBracket).toBeNull();
  });


  // Cover the March tax-year rollover, February end date and leap-year behaviour.
  it('returns the correct SARS tax year boundaries', () => {
    expect(getTaxYear(new Date('2026-10-28T00:00:00Z')).label).toBe('2026/27');
    expect(getTaxYear(new Date('2027-02-28T00:00:00Z')).label).toBe('2026/27');
    expect(getTaxYear(new Date('2027-03-01T00:00:00Z')).label).toBe('2027/28');
    expect(getTaxYear(new Date('2026-02-28T00:00:00Z')).label).toBe('2025/26');
    expect(getTaxYear(new Date('2027-03-01T00:00:00Z')).end).toBe('2028-02-29T00:00:00.000Z');
  });


  // Confirm month grouping, cumulative totals and exclusion of prior-year income.
  it('builds monthly summaries and excludes income outside the year', () => {
    const now = new Date('2026-05-20T00:00:00Z');
    const summary = buildTaxSummary([
      { amount: 10000, createdAt: '2026-03-05T00:00:00Z' },
      { amount: 20000, createdAt: '2026-03-20T00:00:00Z' },
      { amount: 15000, createdAt: '2026-04-10T00:00:00Z' },
      { amount: 25000, createdAt: '2026-05-15T00:00:00Z' },
      { amount: 999999, createdAt: '2025-02-28T00:00:00Z' },
    ], now);


    expect(summary.monthly).toHaveLength(3);
    expect(summary.monthly.map((month) => month.month)).toEqual(['2026-03', '2026-04', '2026-05']);
    expect(summary.monthly[0].gross).toBe(30000);
    expect(summary.monthly[1].gross).toBe(15000);
    expect(summary.monthly[2].gross).toBe(25000);
    expect(summary.monthly.every((month, index, months) => index === 0 || month.cumulativeGross >= months[index - 1].cumulativeGross)).toBe(true);
    expect(summary.netIncome).toBe(summary.grossIncome - summary.estimatedTax);
  });


  // Empty transaction history should produce a valid zero-income summary.
  it('returns an all-zero summary with no transactions', () => {
    const summary = buildTaxSummary([], new Date('2026-06-01T00:00:00Z'));
    expect(summary.grossIncome).toBe(0);
    expect(summary.estimatedTax).toBe(0);
    expect(summary.netIncome).toBe(0);
    expect(summary.effectiveRate).toBe(0);
    expect(summary.nextBracket).not.toBeNull();
  });
});
