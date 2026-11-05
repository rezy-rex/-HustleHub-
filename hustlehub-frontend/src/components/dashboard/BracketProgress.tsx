// OWNER: Lesedi — REMOVE BEFORE COMMIT
import React from 'react';
import { formatPercent, formatZAR } from '../../utils/currency';

interface BracketProgressProps {
  grossIncome: number;
  marginalRate: number;
  taxFreeThreshold: number;
  nextBracket: { threshold: number; remaining: number; rate: number } | null;
}

export const BracketProgress: React.FC<BracketProgressProps> = ({ grossIncome, marginalRate, taxFreeThreshold, nextBracket }) => {
  let message: string;
  if (grossIncome < taxFreeThreshold) {
    message = `No tax is due yet. You are below the tax-free threshold of ${formatZAR(taxFreeThreshold)}.`;
  } else if (!nextBracket) {
    message = `You are in the top tax bracket at ${formatPercent(marginalRate)}.`;
  } else {
    message = `You are in the ${formatPercent(marginalRate)} bracket. ${formatZAR(nextBracket.remaining)} until the next bracket (${formatPercent(nextBracket.rate)}).`;
  }
  return <div className="card bracket-progress"><h2>Bracket position</h2><p>{message}</p></div>;
};
