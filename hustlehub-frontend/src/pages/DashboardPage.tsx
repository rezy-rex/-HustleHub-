import React, { useEffect, useState } from 'react';
import { ApiError, TaxSummary, transactionsApi } from '../api/client';
import { formatPercent, formatZAR } from '../utils/currency';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { IncomeBarChart } from '../components/dashboard/IncomeBarChart';
import { CumulativeTaxChart } from '../components/dashboard/CumulativeTaxChart';
import { BracketProgress } from '../components/dashboard/BracketProgress';
import { AssumptionsBox } from '../components/dashboard/AssumptionsBox';

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    transactionsApi.getTaxSummary()
      .then((data) => { if (active) setSummary(data); })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : new ApiError('Unable to load tax summary').message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="dashboard-state" role="status">Loading dashboard...</div>;
  if (error) return <div className="alert-error dashboard-state" role="alert">{error}</div>;
  if (!summary) return <div className="dashboard-state">No dashboard data available</div>;
  if (summary.grossIncome === 0) return <div className="dashboard-state card">No income recorded this tax year yet</div>;

  return (
    <div className="dashboard-page">
      <h1>Income and tax estimate, {summary.taxYear.label}</h1>
      <div className="dashboard-summary-grid">
        <SummaryCard label="Gross income (year to date)" value={formatZAR(summary.grossIncome)} />
        <SummaryCard label="Estimated tax" value={formatZAR(summary.estimatedTax)} />
        <SummaryCard label="Net after tax" value={formatZAR(summary.netIncome)} />
        <SummaryCard label="Effective tax rate" value={formatPercent(summary.effectiveRate)} />
      </div>
      <div className="dashboard-chart-grid">
        <IncomeBarChart data={summary.monthly} />
        <CumulativeTaxChart data={summary.monthly} />
      </div>
      <BracketProgress grossIncome={summary.grossIncome} marginalRate={summary.marginalRate} taxFreeThreshold={summary.taxFreeThreshold} nextBracket={summary.nextBracket} />
      <AssumptionsBox assumptions={summary.assumptions} />
    </div>
  );
};
