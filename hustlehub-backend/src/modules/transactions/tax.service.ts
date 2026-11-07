export interface TaxYear {
  startYear: number;
  label: string;
  start: string;
  end: string;
}


// One progressive income-tax band: its upper income limit, tax accumulated
// before this band, and the marginal rate applied within the band.
interface TaxBracket {
  upTo: number;
  baseTax: number;
  rate: number;
}


export interface TaxSummary {
  taxYear: { label: string; start: string; end: string };
  grossIncome: number;
  estimatedTax: number;
  netIncome: number;
  effectiveRate: number;
  marginalRate: number;
  rebate: number;
  taxFreeThreshold: number;
  nextBracket: { threshold: number; remaining: number; rate: number } | null;
  monthly: { month: string; gross: number; cumulativeGross: number; cumulativeTax: number }[];
  assumptions: string[];
}


// Tax constants for the configured table. Update these with verified SARS values
// when adding a tax year; this implementation currently applies only the primary
// rebate and assumes the taxpayer is under 65.
const REBATE = 17820;
const TAX_FREE_THRESHOLD = 99000;


// Progressive personal income-tax tables keyed by SARS tax-year start year.
// The latest configured table is used as a fallback when a future year is not loaded.
const TAX_TABLES: Record<number, TaxBracket[]> = {
  2026: [
    { upTo: 245100, baseTax: 0, rate: 0.18 },
    { upTo: 383100, baseTax: 44118, rate: 0.26 },
    { upTo: 530200, baseTax: 79998, rate: 0.31 },
    { upTo: 695800, baseTax: 125599, rate: 0.36 },
    { upTo: 887000, baseTax: 185215, rate: 0.39 },
    { upTo: 1878600, baseTax: 259783, rate: 0.41 },
    { upTo: Infinity, baseTax: 666339, rate: 0.45 },
  ],
};


const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;


// South African tax years run from 1 March through the final day of February.
// UTC date operations keep boundary calculations deterministic across server time zones.
export function getTaxYear(date: Date): TaxYear {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const actualStartYear = month >= 2 ? year : year - 1;
  const start = new Date(Date.UTC(actualStartYear, 2, 1)).toISOString();
  const end = new Date(Date.UTC(actualStartYear + 1, 2, 0)).toISOString();
  return {
    startYear: actualStartYear,
    label: `${actualStartYear}/${String(actualStartYear + 1).slice(-2)}`,
    start,
    end,
  };
}


function getLowerBound(table: TaxBracket[], bracketIndex: number): number {
  return bracketIndex === 0 ? 0 : table[bracketIndex - 1].upTo;
}


// Applies the progressive bracket formula, subtracts the configured rebate,
// and reports the current marginal rate and distance to the next bracket.
export function calculateTax(income: number, startYear: number): {
  tax: number;
  marginalRate: number;
  bracketIndex: number;
  nextBracket: { threshold: number; remaining: number; rate: number } | null;
} {
  const table = TAX_TABLES[startYear] ?? TAX_TABLES[Math.max(...Object.keys(TAX_TABLES).map(Number))];
  const safeIncome = Math.max(0, Number.isFinite(income) ? income : 0);
  let bracketIndex = table.findIndex((bracket) => safeIncome <= bracket.upTo);
  if (bracketIndex < 0) bracketIndex = table.length - 1;


  const bracket = table[bracketIndex];
  const lowerBound = getLowerBound(table, bracketIndex);
  const rawTax = bracket.baseTax + (safeIncome - lowerBound) * bracket.rate - REBATE;
  const tax = roundMoney(Math.max(0, rawTax));


  const next = table[bracketIndex + 1];
  const nextBracket = bracket.upTo === Infinity
    ? null
    : {
        threshold: bracket.upTo,
        remaining: roundMoney(Math.max(0, bracket.upTo - safeIncome)),
        rate: next.rate,
      };


  return { tax, marginalRate: bracket.rate, bracketIndex, nextBracket };
}


// Builds a tax-year-to-date estimate from recorded transactions. This is a
// planning aid, not a full SARS assessment: expenses, deductions and other rebates
// are outside the scope of the current calculation.
export function buildTaxSummary(
  transactions: { amount: number; createdAt: string | Date }[],
  now: Date
): TaxSummary {
  const taxYear = getTaxYear(now);
  let tableStartYear = taxYear.startYear;
  let fallbackAssumption = '';
  if (!TAX_TABLES[tableStartYear]) {
    tableStartYear = Math.max(...Object.keys(TAX_TABLES).map(Number));
    fallbackAssumption = `SARS tables for ${taxYear.label} are not loaded yet; the latest available tables are used.`;
  }


  const yearStart = new Date(taxYear.start);
  const yearEnd = new Date(taxYear.end);
  // Include only valid transactions inside the selected tax year; negative and
  // non-finite amounts are treated as zero to avoid corrupting the aggregate.
  const grossIncome = roundMoney(transactions.reduce((sum, transaction) => {
    const date = new Date(transaction.createdAt);
    if (!Number.isNaN(date.getTime()) && date.getTime() >= yearStart.getTime() && date.getTime() <= yearEnd.getTime() + 86399999) {
      return sum + Math.max(0, Number.isFinite(transaction.amount) ? transaction.amount : 0);
    }
    return sum;
  }, 0));


  const taxResult = calculateTax(grossIncome, tableStartYear);
  const monthly: TaxSummary['monthly'] = [];
  const startMonth = yearStart.getUTCMonth();
  const startYear = yearStart.getUTCFullYear();
  let monthsToInclude: number;
  if (now.getUTCFullYear() === startYear) {
    monthsToInclude = now.getUTCMonth() >= startMonth ? now.getUTCMonth() - startMonth + 1 : 0;
  } else {
    monthsToInclude = 12 + now.getUTCMonth() - startMonth + 1;
  }


  // Aggregate eligible income by UTC calendar month for the cumulative breakdown.
  const monthlyTotals = new Map<string, number>();
  for (const transaction of transactions) {
    const date = new Date(transaction.createdAt);
    if (!Number.isNaN(date.getTime()) && date.getTime() >= yearStart.getTime() && date.getTime() <= yearEnd.getTime() + 86399999) {
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + Math.max(0, Number.isFinite(transaction.amount) ? transaction.amount : 0));
    }
  }


  let cumulativeGross = 0;
  for (let i = 0; i < monthsToInclude && i < 12; i += 1) {
    const monthDate = new Date(Date.UTC(startYear, startMonth + i, 1));
    const month = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`;
    if (monthDate.getTime() > now.getTime()) break;
    const monthGross = roundMoney(monthlyTotals.get(month) ?? 0);
    cumulativeGross = roundMoney(cumulativeGross + monthGross);
    monthly.push({ month, gross: monthGross, cumulativeGross, cumulativeTax: calculateTax(cumulativeGross, tableStartYear).tax });
  }


  // Surface the model limitations alongside the estimate so consumers are not
  // led to treat this simplified calculation as tax advice or a SARS assessment.
  const assumptions = [
    'All income recorded on HustleHub+ is treated as taxable income; expenses and deductions are not considered.',
    'Only the primary rebate is applied (assumes you are under 65).',
    `Tax is estimated on year-to-date income as if it were your full-year income, using the SARS ${taxYear.label} tax tables.`,
    'South African tax year: 1 March to the last day of February. Amounts are in ZAR.',
    'This is an estimate for planning only. It is not tax advice or an assessment by SARS.',
  ];
  if (fallbackAssumption) assumptions.push(fallbackAssumption);


  return {
    taxYear: { label: taxYear.label, start: taxYear.start, end: taxYear.end },
    grossIncome,
    estimatedTax: taxResult.tax,
    netIncome: roundMoney(grossIncome - taxResult.tax),
    effectiveRate: grossIncome === 0 ? 0 : taxResult.tax / grossIncome,
    marginalRate: taxResult.marginalRate,
    rebate: REBATE,
    taxFreeThreshold: TAX_FREE_THRESHOLD,
    nextBracket: taxResult.nextBracket,
    monthly,
    assumptions,
  };
}
