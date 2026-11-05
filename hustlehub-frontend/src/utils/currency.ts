// OWNER: Lesedi — REMOVE BEFORE COMMIT
export function formatZAR(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(value)
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
