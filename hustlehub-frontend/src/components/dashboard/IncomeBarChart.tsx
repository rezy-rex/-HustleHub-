// OWNER: Lesedi — REMOVE BEFORE COMMIT
import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatZAR } from '../../utils/currency';

export interface MonthlyIncome { month: string; gross: number; }

export const IncomeBarChart: React.FC<{ data: MonthlyIncome[] }> = ({ data }) => {
  const chartData = data.map((item) => ({ ...item, label: monthLabel(item.month) }));
  return (
    <section className="card dashboard-chart" aria-label="Monthly income chart">
      <h2>Monthly income</h2>
      <div className="dashboard-chart-container" aria-label="Monthly income bar chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(value) => formatZAR(Number(value))} />
            <Tooltip formatter={(value) => formatZAR(Number(value ?? 0))} />
            <Bar dataKey="gross" name="Income" fill="#f05a28" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export function monthLabel(month: string): string {
  const [, monthNumber] = month.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[Number(monthNumber) - 1] || month;
}
