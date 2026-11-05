// OWNER: Lesedi — REMOVE BEFORE COMMIT
import React from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatZAR } from '../../utils/currency';
import { monthLabel } from './IncomeBarChart';

export interface CumulativePoint { month: string; cumulativeGross: number; cumulativeTax: number; }

export const CumulativeTaxChart: React.FC<{ data: CumulativePoint[] }> = ({ data }) => {
  const chartData = data.map((item) => ({ ...item, label: monthLabel(item.month) }));
  return (
    <section className="card dashboard-chart" aria-label="Cumulative income and tax chart">
      <h2>Cumulative income and estimated tax</h2>
      <div className="dashboard-chart-container" aria-label="Cumulative income and tax line chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(value) => formatZAR(Number(value))} />
            <Tooltip formatter={(value) => formatZAR(Number(value ?? 0))} />
            <Area type="monotone" dataKey="cumulativeGross" name="Cumulative gross" fill="#ffedd5" stroke="#f05a28" />
            <Line type="monotone" dataKey="cumulativeTax" name="Cumulative tax" stroke="#1e293b" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
