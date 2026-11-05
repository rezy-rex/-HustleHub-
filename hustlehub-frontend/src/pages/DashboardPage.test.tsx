import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
import { transactionsApi } from '../api/client';
import { formatZAR } from '../utils/currency';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return { ...actual, transactionsApi: { listMine: vi.fn(), getTaxSummary: vi.fn() } };
});

const summary = {
  taxYear: { label: '2026/27', start: '2026-03-01', end: '2027-02-28' },
  grossIncome: 1234.5,
  estimatedTax: 260,
  netIncome: 974.5,
  effectiveRate: 0.2105,
  marginalRate: 0.26,
  rebate: 17235,
  taxFreeThreshold: 95750,
  nextBracket: { threshold: 237100, remaining: 100000, rate: 0.31 },
  monthly: [{ month: '2026-03', gross: 1234.5, cumulativeGross: 1234.5, cumulativeTax: 260 }],
  assumptions: ['Assumption one', 'Assumption two'],
};

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders four formatted summary values and assumptions', async () => {
    vi.mocked(transactionsApi.getTaxSummary).mockResolvedValueOnce(summary);
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText(/Income and tax estimate/i)).toBeInTheDocument());
    expect(screen.getByText('Gross income (year to date)')).toBeInTheDocument();
    expect(screen.getByText(formatZAR(summary.grossIncome))).toBeInTheDocument();
    expect(screen.getByText(formatZAR(summary.estimatedTax))).toBeInTheDocument();
    expect(screen.getByText(formatZAR(summary.netIncome))).toBeInTheDocument();
    expect(screen.getByText('21.1%')).toBeInTheDocument();
    expect(screen.getByText('Assumption one')).toBeInTheDocument();
    expect(screen.getByText('Assumption two')).toBeInTheDocument();
  });

  it('shows the empty state when gross income is zero', async () => {
    vi.mocked(transactionsApi.getTaxSummary).mockResolvedValueOnce({ ...summary, grossIncome: 0 });
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('No income recorded this tax year yet')).toBeInTheDocument());
  });

  it('shows the API error message', async () => {
    vi.mocked(transactionsApi.getTaxSummary).mockRejectedValueOnce(new Error('Tax summary unavailable'));
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Tax summary unavailable'));
  });
});
