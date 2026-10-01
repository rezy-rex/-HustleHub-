// OWNER: Lesedi — REMOVE BEFORE COMMIT

/**
 * Format a numeric amount into South African Rands (ZAR).
 * Example: 2500 -> "R 2,500"
 */
export function formatRands(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'R 0';
  }
  return `R ${Number(amount).toLocaleString('en-ZA')}`;
}

/**
 * Format a numeric amount into South African Rands with two decimal places.
 * Example: 2500 -> "R 2,500.00"
 */
export function formatRandsWithDecimals(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'R 0.00';
  }
  return `R ${Number(amount).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
