// OWNER: Lesedi — REMOVE BEFORE COMMIT
import React from 'react';

export const AssumptionsBox: React.FC<{ assumptions: string[] }> = ({ assumptions }) => (
  <section className="card assumptions-box">
    <h2>How this estimate works</h2>
    <ul>{assumptions.map((assumption, index) => <li key={`${index}-${assumption}`}>{assumption}</li>)}</ul>
  </section>
);
