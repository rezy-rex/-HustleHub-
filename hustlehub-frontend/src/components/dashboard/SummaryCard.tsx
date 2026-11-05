// OWNER: Lesedi — REMOVE BEFORE COMMIT
import React from 'react';

interface SummaryCardProps { label: string; value: string; }

export const SummaryCard: React.FC<SummaryCardProps> = ({ label, value }) => (
  <div className="card dashboard-summary-card">
    <span className="dashboard-summary-label">{label}</span>
    <strong className="dashboard-summary-value">{value}</strong>
  </div>
);
