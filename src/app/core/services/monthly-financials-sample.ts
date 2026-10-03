import type { MonthlyReport } from './reporting.service';

/**
 * Made-up figures for the Monthly Financials reports, shown until the real API is ready. Each report is
 * built in the same shape the API returns (the same sections and column names), so the pages work
 * exactly as they will with real data. The numbers follow the chosen period: year-to-date figures grow
 * through the year, and earlier years are a little smaller. Nothing here comes from Sage.
 */

type Cell = string | number | null;
type Section = MonthlyReport['sections'][number];

/** A steady pseudo-random number from 0 to 1 for a seed, so the same period always shows the same data. */
function rnd(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** The last day of the period, as the API sends it. */
function asOfIso(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 19);
}

// ---- Income (shared by the Statement of Income, Income Statement and Balance Sheet) ----

interface Year {
  year: number;
  revenue: number;
  cost: number;
  opex: number;
  interestIncome: number;
  misc: number;
  interestExpense: number;
  net: number;
  distributions: number;
  reBegin: number;
  reEnd: number;
}

/** Revenue, costs and retained earnings for the period's year and the two before it. */
function years(year: number, month: number): Year[] {
  const out: Year[] = [];
  let re = 6_200_000;
  // oldest first, so retained earnings roll forward
  for (const y of [year - 2, year - 1, year]) {
    const frac = y === year ? month / 12 : 1;
    const annual = 21_000_000 * Math.pow(1.1, y - year);
    const revenue = annual * frac;
    const cost = revenue * (0.74 + rnd(y) * 0.04);
    const opex = revenue * (0.125 + rnd(y + 3) * 0.02);
    const interestIncome = revenue * 0.002;
    const misc = revenue * 0.006;
    const interestExpense = revenue * 0.003;
    const net = revenue - cost - opex + interestIncome + misc - interestExpense;
    const distributions = revenue * 0.025;
    const reBegin = re;
    re = reBegin + net - distributions;
    out.push({ year: y, revenue, cost, opex, interestIncome, misc, interestExpense, net, distributions, reBegin, reEnd: re });
  }
  return out.reverse(); // newest first, like the API
}

function statementOfIncome(year: number, month: number): Section[] {
  const rows: Cell[][] = years(year, month).map((y) => {
    const gross = y.revenue - y.cost;
    const other = y.interestIncome + y.misc - y.interestExpense;
    return [
      y.year,
      round(y.revenue), round(y.cost), round(gross), round(y.opex), round(gross - y.opex),
      round(y.interestIncome), round(y.misc), round(-y.interestExpense), round(other),
      round(y.net), round(y.reBegin), round(y.distributions), round(y.reEnd),
    ];
  });
  return [
    {
      title: '5b-FS Income & RE',
      columns: ['year', 'contract_revenues', 'costs_of_contract_revenues', 'gross_profit', 'operating_expenses', 'income_before_other', 'interest_income', 'miscellaneous_income', 'interest_expense', 'total_other_income_expense', 'net_income', 'retained_earnings_beginning', 'less_distributions', 'retained_earnings_end'],
      rows,
    },
  ];
}

// ---- Income Statement - All Departments ----

interface Account {
  order: number;
  section: string;
  account: number;
  name: string;
  /** Share of the year's revenue (for expenses and income). */
  share: number;
}

const ACCOUNTS: Account[] = [
  { order: 10, section: 'Operating Income', account: 40000, name: 'Contract Revenue', share: 0.93 },
  { order: 10, section: 'Operating Income', account: 40100, name: 'Change Order Revenue', share: 0.07 },
  { order: 20, section: 'Direct Expense', account: 50000, name: 'Direct Labor', share: 0.3 },
  { order: 20, section: 'Direct Expense', account: 50100, name: 'Materials', share: 0.27 },
  { order: 20, section: 'Direct Expense', account: 50200, name: 'Subcontractors', share: 0.12 },
  { order: 20, section: 'Direct Expense', account: 50300, name: 'Equipment Rental', share: 0.05 },
  { order: 30, section: 'Overhead Expense', account: 60000, name: 'Vehicles', share: 0.032 },
  { order: 30, section: 'Overhead Expense', account: 60100, name: 'General Insurance / Life', share: 0.028 },
  { order: 30, section: 'Overhead Expense', account: 60200, name: 'Rent and Utilities', share: 0.022 },
  { order: 40, section: 'Administrative Expense', account: 70000, name: 'Salaries', share: 0.05 },
  { order: 40, section: 'Administrative Expense', account: 70100, name: 'Professional Fees', share: 0.012 },
  { order: 40, section: 'Administrative Expense', account: 70200, name: 'Office and Technology', share: 0.011 },
  { order: 50, section: 'Other Income', account: 42000, name: 'Interest Income', share: 0.002 },
  { order: 50, section: 'Other Income', account: 44000, name: 'Discounts Earned', share: 0.006 },
];

function incomeStatement(year: number, month: number): Section[] {
  const frac = month / 12;
  const annual = 21_000_000;
  const prior = annual * 0.9;
  const rows: Cell[][] = ACCOUNTS.map((a, i) => {
    const wobble = 1 + (rnd(a.account + month) - 0.5) * 0.08;
    const ytd = annual * a.share * frac * wobble;
    const priorYtd = prior * a.share * frac * (1 + (rnd(a.account + 7) - 0.5) * 0.1);
    const period = (annual * a.share) / 12 * (1 + (rnd(a.account + month * 3) - 0.5) * 0.2);
    const priorPeriod = (prior * a.share) / 12 * (1 + (rnd(a.account + month * 5) - 0.5) * 0.2);
    // budget: income a little under actual, expenses a little over, so both colours show
    const bias = a.order === 10 || a.order === 50 ? 0.96 : 1.03 + rnd(i) * 0.03;
    return [a.order, a.section, a.account, a.name, round(period), round(ytd), round(priorPeriod), round(priorYtd), round((period * bias)), round(ytd * bias)];
  });
  const sumBy = (orders: number[], col: number) => rows.filter((r) => orders.includes(r[0] as number)).reduce((n, r) => n + (r[col] as number), 0);
  const summary = (y: number, col: number): Cell[] => {
    const rev = sumBy([10], col);
    const direct = sumBy([20], col);
    const indirect = sumBy([30, 40], col);
    const other = sumBy([50], col);
    const gross = rev - direct;
    return [y, round(rev), round(direct), round(gross), round(rev ? gross / rev : 0, 4), round(indirect), round(gross - indirect), round(gross - indirect + other)];
  };
  return [
    {
      title: '2b-IncomeStatement summary',
      columns: ['postyr', 'ytd_total_operating_income', 'ytd_total_direct_expense', 'ytd_gross_profit', 'ytd_gross_profit_pct', 'ytd_total_indirect_expense', 'ytd_income_from_operations', 'ytd_net_income'],
      rows: [summary(year, 5), summary(year - 1, 7)],
    },
    {
      title: '2-IncomeStatement',
      columns: ['sec_ord', 'section', 'account', 'account_name', 'period_actual', 'ytd_actual', 'prior_year_period', 'prior_year_ytd', 'period_budget', 'ytd_budget'],
      rows,
    },
  ];
}

// ---- Over / Under Billings ----

const JOBS: [number, string][] = [
  [10120, 'Waller Creek'], [10128, '1000 First Avenue Apartments'], [10135, '10135 - 3rd & 3rd'], [10141, 'Harbor Point Tower'],
  [10152, 'Bayview Lofts'], [10173, 'Cedar Ridge Medical'], [10182, 'Maple Street Hotel'], [10190, 'Riverside Elementary'],
  [10204, 'Northgate Plaza'], [10211, 'Summit Data Center'], [10226, 'Lakeshore Condos'], [10238, 'Fairmont Hotel Renovation'],
];

function overUnder(year: number, month: number): Section[] {
  const rows: Cell[][] = JOBS.map(([no, name], i) => {
    const contract = 1_500_000 + rnd(no) * 4_500_000;
    const budget = contract * (0.78 + rnd(no + 1) * 0.1);
    const complete = Math.min(0.97, 0.12 + ((i * 7 + month * 6) % 70) / 100);
    const cost = budget * complete;
    const earned = (contract * cost) / budget;
    const billed = earned * (0.88 + rnd(no + month) * 0.26);
    return [no, name, round(cost), round(budget), round((cost / budget) * 100), round(contract), round(earned), round(billed), round(earned - billed), 'sample'];
  });
  const ou = rows.map((r) => r[8] as number);
  const over = ou.filter((v) => v < 0).reduce((a, b) => a + b, 0);
  const under = ou.filter((v) => v > 0).reduce((a, b) => a + b, 0);
  return [
    { title: '3-OverUnder', columns: ['job_no', 'jobnme', 'cost', 'budget', 'pct_complete', 'contract', 'earned', 'billed', 'over_under', 'budget_source'], rows },
    {
      title: '3-OverUnder totals vs GL',
      columns: ['overbillings_report', 'overbillings_gl_21000', 'underbillings_report', 'underbillings_gl_11900'],
      // the sample ties to the general ledger, as a healthy month would
      rows: [[round(-over), round(-over), round(under), round(under)]],
    },
  ];
}

// ---- AR Aging ----

function arAging(year: number, month: number): Section[] {
  const asOf = Date.UTC(year, month, 0);
  const DAY = 86_400_000;
  const rows: Cell[][] = [];
  let invoice = 2200 + month * 11;
  JOBS.slice(0, 8).forEach(([no, name], j) => {
    const count = 1 + Math.floor(rnd(no + month) * 3);
    for (let k = 0; k < count; k++) {
      // spread invoices across current and each aging bucket
      const daysPastDue = [-20, 12, 45, 75, 110, 8][Math.floor(rnd(no + k * 5 + month) * 6)];
      const balance = 60_000 + rnd(no + k) * 640_000;
      const retained = balance * 0.1;
      const net = balance - retained;
      const due = new Date(asOf - daysPastDue * DAY).toISOString().slice(0, 19);
      const bucket = daysPastDue <= 0 ? 0 : daysPastDue <= 30 ? 1 : daysPastDue <= 60 ? 2 : daysPastDue <= 90 ? 3 : 4;
      const amounts = [0, 0, 0, 0, 0].map((_, b) => (b === bucket ? round(net) : 0));
      rows.push([no, name, invoice++, `Pay application ${j + k + 4}`, due, round(balance), round(retained), ...amounts, round(net)]);
    }
  });
  return [
    {
      title: '4-ARAging',
      columns: ['job_no', 'jobnme', 'invoice_no', 'dscrpt', 'due_date', 'balance', 'retained', 'current', 'd1_30', 'd31_60', 'd61_90', 'd91_plus', 'total_due'],
      rows: rows.sort((a, b) => (a[0] as number) - (b[0] as number)),
    },
  ];
}

// ---- Balance sheet ----

function balanceSheet(year: number, month: number): Section[] {
  const frac = 0.7 + (month / 12) * 0.3;
  const base = (n: number, key: number) => n * frac * (1 + (rnd(key + month) - 0.5) * 0.06);
  const net = years(year, month)[0].net;
  const assets: [number, string, number, string, number][] = [
    [10, 'Current Assets', 10000, 'Cash - Operating', base(3_900_000, 1)],
    [10, 'Current Assets', 10500, 'Cash - Payroll', base(420_000, 2)],
    [10, 'Current Assets', 11200, 'Accounts Receivable - Trade', base(5_300_000, 3)],
    [10, 'Current Assets', 11900, 'Underbillings', base(940_000, 4)],
    [20, 'Long Term Assets', 15000, 'Equipment and Vehicles', base(3_100_000, 5)],
    [30, 'Accumulated Depreciation', 15500, 'Accumulated Depreciation', -base(1_250_000, 6)],
    [40, 'Other Assets', 19000, 'Deposits and Prepaids', base(310_000, 7)],
  ];
  const liabilities: [number, string, number, string, number][] = [
    [50, 'Current Liabilities', 20000, 'Accounts Payable', base(3_400_000, 8)],
    [50, 'Current Liabilities', 20500, 'Accrued Payroll', base(520_000, 9)],
    [50, 'Current Liabilities', 21000, 'Overbillings', base(980_000, 10)],
    [60, 'Long Term Liabilities', 25000, 'Notes Payable', base(1_900_000, 11)],
  ];
  const totalAssets = assets.reduce((n, a) => n + a[4], 0);
  const totalLiabilities = liabilities.reduce((n, a) => n + a[4], 0);
  const equity = totalAssets - totalLiabilities;
  const capital = 500_000;
  const retained = equity - capital - net;
  const equityRows: [number, string, number, string, number][] = [
    [70, 'Equity / Capital', 30000, 'Capital Stock', capital],
    [75, 'Equity / Capital', 33000, 'Retained Earnings', retained],
    [90, 'Current Profit (Loss)', 0, 'Current Profit (Loss) YTD', net],
  ];
  const rows: Cell[][] = [...assets, ...liabilities, ...equityRows].map(([order, section, account, name, amount]) => [order, section, account || null, name, round(amount)]);
  return [
    { title: '1-BalanceSheet totals', columns: ['total_assets', 'total_liabilities', 'total_equity', 'out_of_balance'], rows: [[round(totalAssets), round(totalLiabilities), round(equity), 0]] },
    { title: '1-BalanceSheet', columns: ['sec_ord', 'section', 'account', 'account_name', 'amount'], rows },
  ];
}

const TITLES: Record<string, string> = {
  'statement-of-income': 'Statement of Income',
  backlog: 'Backlog Report',
  'over-under': 'Over Under',
  'ar-aging': 'AR Aging',
  'income-statement-all': 'Income Statement - All Departments',
  'balance-sheet': 'Monthly Balance Sheet',
};

/** One Monthly Financials report with sample figures for the period, in the shape the API returns. */
export function sampleMonthlyReport(key: string, year: number, month: number): MonthlyReport {
  const builders: Record<string, (y: number, m: number) => Section[]> = {
    'statement-of-income': statementOfIncome,
    'income-statement-all': incomeStatement,
    'over-under': overUnder,
    'ar-aging': arAging,
    'balance-sheet': balanceSheet,
  };
  const build = builders[key];
  return {
    key,
    title: TITLES[key] ?? key,
    year,
    month,
    asOf: asOfIso(year, month),
    // Backlog has no data source yet, so it stays "not available", as the API reports it
    available: !!build,
    sections: build ? build(year, month) : [],
  };
}

// ---- Backlog ----

/** The divisions, with the key each Backlog tab uses in its address. */
const BACKLOG_DIVISIONS: { name: string; tab: string }[] = [
  { name: 'Orlando', tab: 'orlando' },
  { name: 'Tampa', tab: 'tampa' },
  { name: 'Texas', tab: 'texas' },
  { name: 'Jacksonville', tab: 'jax' },
  { name: 'Naples', tab: 'naples' },
  { name: 'Concrete', tab: 'concrete' },
];

const CONTRACTORS = ['Turner Construction', 'Skanska USA', 'Brasfield & Gorrie', 'Hensel Phelps', 'Whiting-Turner', 'Moss & Associates', 'Suffolk'];

/** Each division's row on the Backlog overview. A division left out has nothing submitted yet. */
export const SAMPLE_BACKLOG_OVERVIEW: Record<string, { status: 'Completed' | 'Needs Review'; completed: string; revenueYtd?: number; profitYtd?: number; revenueFuture?: number; profitFuture?: number }> = {
  orlando: { status: 'Completed', completed: '2026-06-26T00:00:00', revenueYtd: 4_200_000, profitYtd: 1_550_000, revenueFuture: 3_100_000, profitFuture: 1_200_000 },
  texas: { status: 'Needs Review', completed: '2027-06-25T00:00:00' },
  concrete: { status: 'Completed', completed: '2026-06-02T00:00:00', revenueYtd: 2_000_000, profitYtd: 500_000, revenueFuture: 1_500_000, profitFuture: 410_000 },
};

const usd = (n: number) => (n < 0 ? `(${usdAbs(-n)})` : usdAbs(n));
const usdAbs = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (n: number) => `${Math.round(n)}%`;

/** A sample job on a Backlog tab: the division it belongs to and the cells of its two table rows. */
export interface SampleBacklogJob {
  tab: string;
  table1: string[];
  table2: string[];
}

/** Twelve sample jobs spread over the divisions, as the cells of the two Backlog tables. */
export function sampleBacklogJobs(): SampleBacklogJob[] {
  return JOBS.map(([no, name], i) => {
    const d = BACKLOG_DIVISIONS[i % BACKLOG_DIVISIONS.length];
    const gc = CONTRACTORS[Math.floor(rnd(no) * CONTRACTORS.length)];
    const original = 1_200_000 + rnd(no + 2) * 4_800_000;
    const outstanding = original * rnd(no + 3) * 0.04;
    const approved = original * rnd(no + 4) * 0.08;
    const revised = original + approved;
    const origCost = original * (0.8 + rnd(no + 5) * 0.06);
    const estCo = (outstanding + approved) * 0.82;
    const excess = rnd(no + 6) > 0.7 ? original * 0.015 : 0;
    const revisedCost = origCost + estCo + excess;
    const complete = 0.15 + rnd(no + 7) * 0.8;
    const toDate = revisedCost * complete;
    const toComplete = revisedCost - toDate;
    const billed = revised * (complete + (rnd(no + 8) - 0.5) * 0.12);
    const earned = revised * complete;
    const profit = revised - revisedCost;
    const thisYear = Math.min(1, complete * (0.55 + rnd(no + 9) * 0.35));
    const prevYear = complete - thisYear > 0 ? complete - thisYear : 0;
    const future = Math.max(0, 1 - complete);
    return {
      tab: d.tab,
      table1: [d.name, String(no), name, gc, usd(original), usd(outstanding), usd(approved), usd(revised), usd(origCost), usd(estCo), excess ? usd(excess) : '', usd(revisedCost), usd(toDate), usd(toComplete)],
      table2: [d.name, String(no), name, gc, pct(complete * 100), usd(billed), usd(earned - billed), pct(thisYear * 100), usd(profit * prevYear), usd(profit * thisYear), usd(profit * future), usd(revised * prevYear), usd(revised * thisYear), usd(revised * future)],
    };
  });
}
