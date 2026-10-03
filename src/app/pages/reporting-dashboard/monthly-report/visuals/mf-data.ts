import type { MonthlyReport } from '../../../../core/services/reporting.service';
import type { MfKpi } from './mf-kpis.component';

/**
 * The figures behind the Monthly Financials charts, as plain functions: they take a report (or the
 * rows a page already shows) and return what the charts and key-figure cards display. They don't
 * touch Angular, so they can be tested on their own.
 */

export type Rec = Record<string, unknown>;

export interface WaterfallStep {
  label: string;
  value: number;
  /** 'total' bars start at zero; 'delta' bars start where the last one ended. */
  kind: 'total' | 'delta';
}

export interface BarRow {
  label: string;
  sub?: string;
  value: number;
}

export interface StackSegment {
  label: string;
  value: number;
  color: string;
}

/** One group of lines in a grouped table (a section such as "Direct Expense"). */
export interface TableGroup {
  title: string;
  rows: { account: string; name: string; values: (number | null)[] }[];
  totals: (number | null)[];
}

// ---- Formatting ----

/** $1.24M / $48K / $900, or a dash when there's no number. */
export function shortMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  const a = Math.abs(n);
  const body = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M` : a >= 1e3 ? `${Math.round(a / 1e3)}K` : `${Math.round(a)}`;
  return `${n < 0 ? '-' : ''}$${body}`;
}

/** $1,234,567 with negatives in brackets, or a dash. */
export function fullMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  const s = Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return n < 0 ? `(${s})` : s;
}

/** Percent change from `prior` to `cur`, or null when there's nothing to compare with. */
export function change(cur: number | null | undefined, prior: number | null | undefined): number | null {
  if (cur === null || cur === undefined || prior === null || prior === undefined || prior === 0) return null;
  return ((cur - prior) / Math.abs(prior)) * 100;
}

const num = (v: unknown): number => (typeof v === 'number' ? v : v === null || v === undefined ? 0 : Number(v) || 0);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number.isNaN(Number(v)) ? null : Number(v));
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** A section of the report as one object per row, keyed by column name. */
export function records(report: MonthlyReport | null, title: string): Rec[] {
  const s = report?.sections.find((x) => x.title === title);
  if (!s) return [];
  return s.rows.map((r) => Object.fromEntries(s.columns.map((c, i) => [c, r[i]])));
}

const GOOD = '#14915b';
const BAD = '#c2410c';

// ---- Statement of Income ----

export function statementYears(report: MonthlyReport | null, year: number): { cur: Rec | null; prior: Rec | null } {
  const rows = records(report, '5b-FS Income & RE');
  return {
    cur: rows.find((r) => Number(r['year']) === year) ?? null,
    prior: rows.find((r) => Number(r['year']) === year - 1) ?? null,
  };
}

export function statementKpis(cur: Rec | null, prior: Rec | null): MfKpi[] {
  const pick = (r: Rec | null, k: string) => (r ? num(r[k]) : null);
  const rev = pick(cur, 'contract_revenues');
  const gp = pick(cur, 'gross_profit');
  const net = pick(cur, 'net_income');
  const re = pick(cur, 'retained_earnings_end');
  const margin = (v: number | null) => (v !== null && rev ? `${((v / rev) * 100).toFixed(1)}% of revenue` : undefined);
  return [
    { label: 'Contract revenues', value: shortMoney(rev), icon: 'bi-cash-coin', delta: change(rev, pick(prior, 'contract_revenues')), hint: prior ? 'vs prior year' : undefined },
    { label: 'Gross profit', value: shortMoney(gp), icon: 'bi-graph-up-arrow', delta: change(gp, pick(prior, 'gross_profit')), hint: margin(gp) },
    { label: 'Net income', value: shortMoney(net), icon: 'bi-piggy-bank', tone: net !== null && net < 0 ? 'bad' : undefined, delta: change(net, pick(prior, 'net_income')), hint: margin(net) },
    { label: 'Retained earnings', value: shortMoney(re), icon: 'bi-safe', delta: change(re, pick(prior, 'retained_earnings_end')), hint: 'end of period' },
  ];
}

/** Revenue to net income, step by step. */
export function statementSteps(cur: Rec | null): WaterfallStep[] {
  if (!cur) return [];
  return [
    { label: 'Contract revenues', value: num(cur['contract_revenues']), kind: 'total' },
    { label: 'Costs of revenues', value: -num(cur['costs_of_contract_revenues']), kind: 'delta' },
    { label: 'Gross profit', value: num(cur['gross_profit']), kind: 'total' },
    { label: 'Operating expenses', value: -num(cur['operating_expenses']), kind: 'delta' },
    { label: 'Other income (expense)', value: num(cur['total_other_income_expense']), kind: 'delta' },
    { label: 'Net income', value: num(cur['net_income']), kind: 'total' },
  ];
}

// ---- Over/Under Billings ----

export function overUnderViz(
  rows: { job: string; name: string; overUnder: number | null }[],
  gl: { liabilities: number | null; assets: number | null }
): { kpis: MfKpi[]; bars: BarRow[] } {
  const ou = rows.map((r) => r.overUnder ?? 0);
  const over = sum(ou.filter((v) => v < 0));
  const under = sum(ou.filter((v) => v > 0));
  const net = over + under;
  const have = rows.length > 0;
  // the report ties to Sage when overbillings match GL 21000 and underbillings match GL 11900
  const diffOver = gl.liabilities === null ? null : Math.abs(Math.abs(over) - gl.liabilities);
  const diffUnder = gl.assets === null ? null : Math.abs(under - gl.assets);
  const ties = have && diffOver !== null && diffUnder !== null ? diffOver < 1 && diffUnder < 1 : null;
  const kpis: MfKpi[] = [
    { label: 'Overbilled', value: have ? shortMoney(Math.abs(over)) : '–', icon: 'bi-box-arrow-in-down', hint: 'liability, GL 21000' },
    { label: 'Underbilled', value: have ? shortMoney(under) : '–', icon: 'bi-box-arrow-up', hint: 'asset, GL 11900' },
    { label: 'Net over / (under)', value: have ? shortMoney(net) : '–', icon: 'bi-plus-slash-minus', hint: have ? (net < 0 ? 'net overbilled' : net > 0 ? 'net underbilled' : 'even') : undefined },
    {
      label: 'Ties to Sage GL',
      value: ties === null ? '–' : ties ? 'Yes' : 'Off',
      icon: 'bi-patch-check',
      tone: ties === null ? undefined : ties ? 'good' : 'warn',
      hint: ties === false ? `by ${shortMoney((diffOver ?? 0) + (diffUnder ?? 0))}` : `${rows.length} ${rows.length === 1 ? 'job' : 'jobs'}`,
    },
  ];
  const bars = [...rows]
    .filter((r) => r.overUnder !== null && r.overUnder !== 0)
    .sort((a, b) => Math.abs(b.overUnder ?? 0) - Math.abs(a.overUnder ?? 0))
    .slice(0, 10)
    .map((r) => ({ label: r.job, sub: r.name, value: r.overUnder ?? 0 }));
  return { kpis, bars };
}

// ---- AR Aging ----

/** The order of the totals on an AR job: balance, retained, current, 1-30, 31-60, 61-90, 91+, total due. */
export function arViz(jobs: { job: string; name: string; totals: number[] }[], grand: number[]): { kpis: MfKpi[]; stack: StackSegment[]; bars: BarRow[] } {
  const g = (i: number) => grand[i] ?? 0;
  const totalDue = g(7);
  const pastDue = g(3) + g(4) + g(5) + g(6);
  const have = jobs.length > 0;
  const kpis: MfKpi[] = [
    { label: 'Total due', value: have ? shortMoney(totalDue) : '–', icon: 'bi-receipt', hint: have ? `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}` : undefined },
    { label: 'Retainage held', value: have ? shortMoney(g(1)) : '–', icon: 'bi-safe', hint: 'not yet due' },
    { label: 'Past due', value: have ? shortMoney(pastDue) : '–', icon: 'bi-clock-history', tone: have && pastDue > 0 ? 'warn' : undefined, hint: have && totalDue ? `${((pastDue / totalDue) * 100).toFixed(0)}% of total due` : undefined },
    { label: '91+ days', value: have ? shortMoney(g(6)) : '–', icon: 'bi-exclamation-octagon', tone: have && g(6) > 0 ? 'bad' : undefined, hint: 'needs follow-up' },
  ];
  const stack: StackSegment[] = [
    { label: 'Current', value: g(2), color: 'var(--sh-blue)' },
    { label: '1-30', value: g(3), color: 'var(--sh-blue-2)' },
    { label: '31-60', value: g(4), color: '#f0b64a' },
    { label: '61-90', value: g(5), color: '#f26b2a' },
    { label: '91+', value: g(6), color: BAD },
  ];
  const bars = jobs
    .map((j) => ({ label: j.job, sub: j.name, value: (j.totals[3] ?? 0) + (j.totals[4] ?? 0) + (j.totals[5] ?? 0) + (j.totals[6] ?? 0) }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  return { kpis, stack, bars };
}

// ---- Backlog overview ----

export function backlogViz(
  rows: { name: string; status: string; revenueYtd: number | null; profitYtd: number | null }[]
): { kpis: MfKpi[]; completePct: number | null; bars: BarRow[] } {
  const done = rows.filter((r) => r.status === 'Completed').length;
  const review = rows.filter((r) => r.status === 'Needs Review').length;
  const pending = rows.length - done - review;
  const revenue = rows.filter((r) => r.revenueYtd !== null);
  const profit = rows.filter((r) => r.profitYtd !== null);
  return {
    kpis: [
      { label: 'Divisions complete', value: `${done} of ${rows.length}`, icon: 'bi-check2-circle', tone: rows.length && done === rows.length ? 'good' : undefined, hint: pending ? `${pending} pending` : 'all submitted' },
      { label: 'Needs review', value: String(review), icon: 'bi-flag', tone: review ? 'warn' : undefined, hint: review ? 'check these divisions' : 'none' },
      { label: 'Projected revenue YTD', value: revenue.length ? shortMoney(sum(revenue.map((r) => r.revenueYtd ?? 0))) : '–', icon: 'bi-cash-coin', hint: revenue.length ? undefined : 'no backlog data yet' },
      { label: 'Projected profit YTD', value: profit.length ? shortMoney(sum(profit.map((r) => r.profitYtd ?? 0))) : '–', icon: 'bi-graph-up-arrow', hint: profit.length ? undefined : 'no backlog data yet' },
    ],
    completePct: rows.length ? (done / rows.length) * 100 : null,
    bars: revenue.map((r) => ({ label: r.name, value: r.revenueYtd ?? 0 })).sort((a, b) => b.value - a.value),
  };
}

// ---- Income Statement - All Departments ----

export function incomeViz(
  report: MonthlyReport | null,
  year: number
): { kpis: MfKpi[]; stack: StackSegment[]; sectionBars: BarRow[]; groups: TableGroup[]; hasData: boolean } {
  const sums = records(report, '2b-IncomeStatement summary');
  const cur = sums.find((r) => Number(r['postyr']) === year) ?? null;
  const prior = sums.find((r) => Number(r['postyr']) === year - 1) ?? null;
  const pick = (r: Rec | null, k: string) => (r ? numOrNull(r[k]) : null);
  const rev = pick(cur, 'ytd_total_operating_income');
  const gpPct = pick(cur, 'ytd_gross_profit_pct');
  const kpis: MfKpi[] = [
    { label: 'Revenue YTD', value: shortMoney(rev), icon: 'bi-cash-coin', delta: change(rev, pick(prior, 'ytd_total_operating_income')), hint: prior ? 'vs prior year' : undefined },
    { label: 'Gross profit YTD', value: shortMoney(pick(cur, 'ytd_gross_profit')), icon: 'bi-graph-up-arrow', delta: change(pick(cur, 'ytd_gross_profit'), pick(prior, 'ytd_gross_profit')), hint: gpPct !== null ? `${(gpPct * 100).toFixed(1)}% margin` : undefined },
    { label: 'Income from operations', value: shortMoney(pick(cur, 'ytd_income_from_operations')), icon: 'bi-building', delta: change(pick(cur, 'ytd_income_from_operations'), pick(prior, 'ytd_income_from_operations')) },
    { label: 'Net income YTD', value: shortMoney(pick(cur, 'ytd_net_income')), icon: 'bi-piggy-bank', tone: (pick(cur, 'ytd_net_income') ?? 0) < 0 ? 'bad' : undefined, delta: change(pick(cur, 'ytd_net_income'), pick(prior, 'ytd_net_income')) },
  ];
  const direct = pick(cur, 'ytd_total_direct_expense') ?? 0;
  const indirect = pick(cur, 'ytd_total_indirect_expense') ?? 0;
  const ops = pick(cur, 'ytd_income_from_operations') ?? 0;
  const stack: StackSegment[] = cur
    ? [
        { label: 'Direct expense', value: Math.max(direct, 0), color: 'var(--sh-blue)' },
        { label: 'Overhead and administrative', value: Math.max(indirect, 0), color: 'var(--sh-blue-2)' },
        { label: 'Income from operations', value: Math.max(ops, 0), color: GOOD },
      ]
    : [];

  // account detail, grouped by section
  const detail = records(report, '2-IncomeStatement');
  const order: string[] = [];
  const by = new Map<string, Rec[]>();
  for (const r of detail) {
    const s = String(r['section'] ?? '');
    if (!by.has(s)) {
      by.set(s, []);
      order.push(s);
    }
    by.get(s)!.push(r);
  }
  const cols = ['period_actual', 'ytd_actual', 'prior_year_ytd', 'ytd_budget'];
  const groups: TableGroup[] = order.map((title) => {
    const rs = by.get(title)!;
    const rows = rs.map((r) => ({ account: String(r['account'] ?? ''), name: String(r['account_name'] ?? ''), values: cols.map((c) => numOrNull(r[c])) }));
    return { title, rows, totals: cols.map((_, i) => sum(rows.map((x) => x.values[i] ?? 0))) };
  });
  const sectionBars: BarRow[] = groups.map((g) => ({ label: g.title, sub: g.totals[3] ? `Budget ${shortMoney(g.totals[3])}` : undefined, value: g.totals[1] ?? 0 }));
  return { kpis, stack, sectionBars, groups, hasData: !!cur || groups.length > 0 };
}

// ---- Monthly Balance Sheet ----

export function balanceViz(report: MonthlyReport | null): {
  kpis: MfKpi[];
  assets: StackSegment[];
  funding: StackSegment[];
  groups: TableGroup[];
  hasData: boolean;
} {
  const t = records(report, '1-BalanceSheet totals')[0] ?? null;
  const rows = records(report, '1-BalanceSheet');
  const secSum = (pred: (order: number, name: string) => boolean) => sum(rows.filter((r) => pred(num(r['sec_ord']), String(r['section'] ?? ''))).map((r) => num(r['amount'])));
  const assets = t ? numOrNull(t['total_assets']) : null;
  const liabilities = t ? numOrNull(t['total_liabilities']) : null;
  const equity = t ? numOrNull(t['total_equity']) : null;
  const off = t ? numOrNull(t['out_of_balance']) : null;
  const currentAssets = secSum((_, n) => n === 'Current Assets');
  const currentLiab = secSum((_, n) => n === 'Current Liabilities');
  const ratio = currentLiab ? currentAssets / currentLiab : null;
  const balanced = off !== null && Math.abs(off) < 0.5;
  const kpis: MfKpi[] = [
    { label: 'Total assets', value: shortMoney(assets), icon: 'bi-building' },
    { label: 'Total liabilities', value: shortMoney(liabilities), icon: 'bi-credit-card-2-front' },
    { label: 'Total equity', value: shortMoney(equity), icon: 'bi-bank' },
    { label: 'Current ratio', value: ratio === null ? '–' : `${ratio.toFixed(2)}x`, icon: 'bi-speedometer2', tone: ratio !== null && ratio < 1 ? 'warn' : undefined, hint: 'current assets ÷ current liabilities' },
    { label: 'Balance check', value: off === null ? '–' : balanced ? 'Balanced' : shortMoney(off), icon: 'bi-patch-check', tone: off === null ? undefined : balanced ? 'good' : 'bad', hint: balanced ? 'assets = liabilities + equity' : off === null ? undefined : 'out of balance' },
  ];
  // assets and what funds them, as two bars
  const fixed = secSum((o) => o === 20 || o === 30);
  const assetsStack: StackSegment[] = rows.length
    ? [
        { label: 'Current assets', value: Math.max(currentAssets, 0), color: 'var(--sh-blue)' },
        { label: 'Fixed assets (net)', value: Math.max(fixed, 0), color: 'var(--sh-blue-2)' },
        { label: 'Other assets', value: Math.max(secSum((o) => o === 40), 0), color: '#8492a8' },
      ]
    : [];
  const funding: StackSegment[] = rows.length
    ? [
        { label: 'Current liabilities', value: Math.max(currentLiab, 0), color: '#f0b64a' },
        { label: 'Long-term liabilities', value: Math.max(secSum((o) => o === 60), 0), color: '#f26b2a' },
        { label: 'Equity', value: Math.max(equity ?? 0, 0), color: GOOD },
      ]
    : [];
  // account detail, grouped by section
  const order: { key: number; title: string }[] = [];
  const by = new Map<string, Rec[]>();
  for (const r of rows) {
    const title = String(r['section'] ?? '');
    if (!by.has(title)) {
      by.set(title, []);
      order.push({ key: num(r['sec_ord']), title });
    }
    by.get(title)!.push(r);
  }
  const groups: TableGroup[] = order
    .sort((a, b) => a.key - b.key)
    .map(({ title }) => {
      const gr = by.get(title)!.map((r) => ({ account: r['account'] === null || r['account'] === undefined ? '' : String(r['account']), name: String(r['account_name'] ?? ''), values: [numOrNull(r['amount'])] as (number | null)[] }));
      return { title, rows: gr, totals: [sum(gr.map((x) => x.values[0] ?? 0))] };
    });
  return { kpis, assets: assetsStack, funding, groups, hasData: !!t || rows.length > 0 };
}

// ---- Overview / YTD Balance Sheet (the mockup's summary lines) ----

/** The balance sheet in the few lines the Overview and YTD Balance Sheet pages show. Null until the figures load. */
export interface BalanceSummary {
  currentAssets: number | null;
  propertyEquipment: number | null;
  otherAssets: number | null;
  totalAssets: number | null;
  currentLiabilities: number | null;
  notesPayable: number | null;
  totalLiabilities: number | null;
  equity: number | null;
  liabilitiesAndEquity: number | null;
}

export function balanceSummary(report: MonthlyReport | null): BalanceSummary {
  const t = records(report, '1-BalanceSheet totals')[0] ?? null;
  const rows = records(report, '1-BalanceSheet');
  const has = rows.length > 0;
  const secSum = (pred: (order: number, name: string) => boolean) => sum(rows.filter((r) => pred(num(r['sec_ord']), String(r['section'] ?? ''))).map((r) => num(r['amount'])));
  const totalLiab = t ? numOrNull(t['total_liabilities']) : null;
  const equity = t ? numOrNull(t['total_equity']) : null;
  return {
    currentAssets: has ? secSum((_, n) => n === 'Current Assets') : null,
    propertyEquipment: has ? secSum((o) => o === 20 || o === 30) : null,
    otherAssets: has ? secSum((o) => o === 40) : null,
    totalAssets: t ? numOrNull(t['total_assets']) : null,
    currentLiabilities: has ? secSum((_, n) => n === 'Current Liabilities') : null,
    notesPayable: has ? secSum((o) => o === 60) : null,
    totalLiabilities: totalLiab,
    equity,
    liabilitiesAndEquity: totalLiab !== null && equity !== null ? totalLiab + equity : null,
  };
}
