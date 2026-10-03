import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MonthlyReport, ReportingService } from '../../../core/services/reporting.service';
import { FinancialPeriodService } from '../../../core/services/financial-period.service';
import { AuthService } from '../../../core/services/auth.service';
import { SAMPLE_BACKLOG_OVERVIEW, sampleBacklogJobs } from '../../../core/services/monthly-financials-sample';
import { MfKpisComponent } from './visuals/mf-kpis.component';
import { MfWaterfallComponent } from './visuals/mf-waterfall.component';
import { MfBarsComponent } from './visuals/mf-bars.component';
import { MfStackComponent } from './visuals/mf-stack.component';
import { MfRingComponent } from './visuals/mf-ring.component';
import { arViz, backlogViz, balanceSummary, balanceViz, change, fullMoney, incomeViz, overUnderViz, shortMoney, statementKpis, statementSteps, statementYears } from './visuals/mf-data';

/** The reports inside Monthly Financials – All, as listed in the sidebar. */
const TITLES: Record<string, string> = {
  overview: 'Overview',
  'ytd-balance-sheet': 'YTD Balance Sheet',
  'statement-of-income': 'Statement of Income',
  backlog: 'Backlog Report',
  'over-under': 'Over Under',
  'ar-aging': 'AR Aging',
  'income-statement-all': 'Income Statement - All Departments',
  'balance-sheet': 'Monthly Balance Sheet',
};

/** The Backlog report and its tabs, which Commit checks for. */
const BACKLOG_TABS = ['Master', 'Orlando', 'Tampa', 'Texas', 'Jax', 'Naples', 'Concrete'];

/** The divisions on the Backlog overview, and the TAB page each one opens. */
const DIVISIONS: { name: string; tab: string }[] = [
  { name: 'Orlando', tab: 'orlando' },
  { name: 'Tampa', tab: 'tampa' },
  { name: 'Texas', tab: 'texas' },
  { name: 'Jacksonville', tab: 'jax' },
  { name: 'Naples', tab: 'naples' },
  { name: 'Concrete', tab: 'concrete' },
];

/**
 * Who counts as Accounting for the Backlog rule "once the PM has submitted a division's backlog, only
 * Accounting can unlock it for the PM to edit" (Warren Hampton). Matched against the signed-in user's
 * Azure AD app role; change this when the real role name is known.
 */
const ACCOUNTING_ROLE = /accounting|admin/i;

/** A division's backlog for one period: being filled in, submitted, or reopened by Accounting. */
type BacklogState = { status: 'submitted' | 'unlocked'; at: string; by: string };
const BACKLOG_STATE_KEY = 'stowell.backlog.state';

/** The money columns on AR Aging, in order (Balance through Total Due). */
const AR_COLUMNS: { key: string; label: string }[] = [
  { key: 'balance', label: 'Balance' },
  { key: 'retained', label: 'Retained' },
  { key: 'current', label: 'Current' },
  { key: 'd1_30', label: '1-30' },
  { key: 'd31_60', label: '31-60' },
  { key: 'd61_90', label: '61-90' },
  { key: 'd91_plus', label: '91+' },
  { key: 'total_due', label: 'Total Due' },
];

/** One job on AR Aging: its open invoices and their totals. */
export interface ArJob {
  job: string;
  name: string;
  invoices: { invoice: string; due: string | null; amounts: number[] }[];
  totals: number[];
}

/** One job's row on Over/Under Billings. */
export interface OverUnderRow {
  job: string;
  name: string;
  cost: number;
  budget: number;
  pct: number | null;
  contract: number;
  earned: number | null;
  billed: number;
  overUnder: number | null;
  /** Typed in on the page (see adjustmentFor); not in the Financials package. */
  adjustment: number | null;
  retainage: number | null;
}

/** The tabs across the top of the Monthly Financials page, one per report. */
const MF_TABS: { label: string; key: string }[] = [
  { label: 'Overview', key: 'overview' },
  { label: 'YTD Balance Sheet', key: 'ytd-balance-sheet' },
  { label: 'YTD Statement of Income', key: 'statement-of-income' },
  { label: 'Monthly Balance Sheet', key: 'balance-sheet' },
  { label: 'Monthly Statement of Income', key: 'income-statement-all' },
  { label: 'Backlog Report', key: 'backlog' },
  { label: 'Over Under', key: 'over-under' },
  { label: 'AR Aging', key: 'ar-aging' },
];

/** The tabs across the top of every Backlog page. */
const BACKLOG_NAV: { label: string; tab: string | null }[] = [
  { label: 'Overview', tab: null },
  { label: 'Master', tab: 'master' },
  { label: 'Orlando', tab: 'orlando' },
  { label: 'Tampa', tab: 'tampa' },
  { label: 'Texas', tab: 'texas' },
  { label: 'Jax', tab: 'jax' },
  { label: 'Naples', tab: 'naples' },
  { label: 'Concrete', tab: 'concrete' },
];

/** The two job tables on each Backlog tab (Master and every division), as in the mockup. */
const BACKLOG_TABLES: { title: string; columns: { label: string; shaded?: boolean; num?: boolean }[] }[] = [
  {
    title: 'Contract and costs',
    columns: [
      { label: 'Division', shaded: true },
      { label: 'Job #', shaded: true },
      { label: 'Job Name', shaded: true },
      { label: 'General Contractor', shaded: true },
      { label: 'Original Contract Amount', shaded: true, num: true },
      { label: 'Outstanding Change Orders', num: true },
      { label: 'Approved Change Orders', num: true },
      { label: 'Revised Contract Amount', shaded: true, num: true },
      { label: 'Original Estimated Costs', shaded: true, num: true },
      { label: 'Est. Cost Outstanding & Approved C. Orders', num: true },
      { label: 'Projected Cost in Excess of Estimate Cost', num: true },
      { label: 'Revised Estimated Cost', num: true },
      { label: 'Costs to Date', num: true },
      { label: 'Costs to Complete', num: true },
    ],
  },
  {
    title: 'Progress, profit and revenue',
    columns: [
      { label: 'Division' },
      { label: 'Job #' },
      { label: 'Job Name' },
      { label: 'General Contractor' },
      { label: 'Percent Complete', num: true },
      { label: 'Amount Billed to Date', num: true },
      { label: 'Amount (Over) Under Billed', num: true },
      { label: 'Percent Complete This Year', num: true },
      { label: 'Profit Earned Previous Year', num: true },
      { label: 'Profit Earned This Year', num: true },
      { label: 'Profit Earned Future Year', num: true },
      { label: 'Revenue Earned Previous Year', num: true },
      { label: 'Revenue Earned This Year', num: true },
      { label: 'Revenue Earned Future Year', num: true },
    ],
  },
];

/** Empty rows shown in each Backlog table until there's job data, as in the mockup. */
const BLANK_ROWS = [0, 1, 2, 3];

/** One division's row on the Backlog overview. Amounts are null until there's backlog data. */
export interface BacklogRow {
  name: string;
  tab: string;
  status: 'Completed' | 'Pending' | 'Needs Review';
  completed: string | null;
  revenueYtd: number | null;
  profitYtd: number | null;
  revenueFuture: number | null;
  profitFuture: number | null;
}

/** The Statement of Income and Retained Earnings, line by line (from the 5b-FS Income & RE query). */
const STATEMENT_LINES: { label: string; col?: string; level?: 1 | 2; strong?: boolean }[] = [
  { label: 'Contract Revenues', col: 'contract_revenues' },
  { label: 'Costs of Contract Revenues', col: 'costs_of_contract_revenues' },
  { label: 'Gross Profit', col: 'gross_profit', strong: true },
  { label: 'Operating Expenses', col: 'operating_expenses' },
  { label: 'Other Income' },
  { label: 'Interest Income', col: 'interest_income', level: 1 },
  { label: 'Miscellaneous Income', col: 'miscellaneous_income', level: 1 },
  { label: 'Interest Expense', col: 'interest_expense', level: 1 },
  { label: 'Total Other Income (Expense)', col: 'total_other_income_expense', level: 2, strong: true },
  { label: 'Net Income', col: 'net_income', strong: true },
  { label: 'Retained Earnings at Beginning of Year', col: 'retained_earnings_beginning' },
  { label: 'Less Distributions', col: 'less_distributions' },
  { label: 'Retained Earnings at End of Year (Period)', col: 'retained_earnings_end', strong: true },
];

/** Column names from the SQL (job_no, account_name) as headings (Job No, Account Name). */
function heading(col: string): string {
  return col
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Section names from the SQL ("4-ARAging totals") without their number prefix ("AR Aging totals"). */
function sectionName(title: string): string {
  return title
    .replace(/^\d+[a-z]?-/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/A R/g, 'AR');
}

/**
 * One report from the Monthly Financials package (Reports > Monthly Financials – All > Statement of
 * Income, AR Aging and so on). The period comes from FinancialPeriodService, so it's the same on every
 * report; the Statement of Income's date sets it. Statement of Income is shown as a statement, with a
 * Commit button that fixes the period for the module and checks for missing reports (Backlog for now).
 * The other reports show their sections as tables. The API runs the whole package and keeps it for 10
 * minutes, so moving between reports for the same month is quick after the first one.
 */
@Component({
  selector: 'app-monthly-report',
  standalone: true,
  imports: [DatePipe, RouterLink, MfKpisComponent, MfWaterfallComponent, MfBarsComponent, MfStackComponent, MfRingComponent],
  templateUrl: './monthly-report.component.html',
  styleUrl: './monthly-report.component.scss',
})
export class MonthlyReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private reporting = inject(ReportingService);
  readonly periodSvc = inject(FinancialPeriodService);

  readonly key = signal('');
  /** The Backlog tab (Master, Orlando, ...) when this is a Backlog page. */
  readonly tab = signal<string | null>(null);
  readonly isStatement = computed(() => this.key() === 'statement-of-income');
  readonly isOverUnder = computed(() => this.key() === 'over-under');
  readonly mfTabs = MF_TABS;
  readonly isArAging = computed(() => this.key() === 'ar-aging');

  // ---- Overview and YTD Balance Sheet (both summarise the balance sheet report) ----
  readonly isOverview = computed(() => this.key() === 'overview');
  readonly isYtdBalance = computed(() => this.key() === 'ytd-balance-sheet');
  /** The balance sheet in a few lines, for the Overview and the YTD Balance Sheet. */
  readonly balSum = computed(() => balanceSummary(this.report()));

  /** Whether every division's backlog has been submitted for a period ('YYYY-MM'). */
  private backlogsDone(period: string): boolean {
    const s = this.states();
    return DIVISIONS.every((d) => s[`${period}:${d.tab}`]?.status === 'submitted');
  }

  /**
   * One row per month of the period's year, as on the mockup's status table. A month is Ready once every
   * division's backlog has been submitted (that is what turns Commit on), and Completed once it's committed.
   */
  readonly monthRows = computed(() => {
    this.periodSvc.commits();
    const y = this.periodSvc.year();
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const period = `${y}-${String(month).padStart(2, '0')}`;
      const status: 'Completed' | 'Ready' | 'Pending' = this.periodSvc.isCommitted(period) ? 'Completed' : this.backlogsDone(period) ? 'Ready' : 'Pending';
      return {
        month,
        period,
        name: new Date(y, i, 1).toLocaleString('en-US', { month: 'long' }),
        status,
        current: this.periodSvc.month() === month,
      };
    });
  });

  /** Clicking a month makes it the period, which pulls its figures so the report pages can be viewed. */
  openMonth(month: number): void {
    this.periodSvc.setPeriod(`${this.periodSvc.year()}-${String(month).padStart(2, '0')}`);
  }

  /** Commit a month (only once it's Ready): makes it the period, then runs the same checks as the Statement of Income's Commit. */
  commitMonth(month: number): void {
    this.openMonth(month);
    this.commit();
  }

  /** Accounting only: reopen a committed month so it can be committed again. */
  unlockMonth(month: number): void {
    if (!this.isAccounting) return;
    this.periodSvc.unlock(`${this.periodSvc.year()}-${String(month).padStart(2, '0')}`);
    this.checkResult.set(null);
  }
  readonly arColumns = AR_COLUMNS;

  /**
   * AR Aging grouped by job. The job totals and the grand total are added up here from the invoice
   * rows, so they always match what's shown (the "auto calculations"); Refresh Report re-pulls the
   * invoices from Sage.
   */
  readonly arJobs = computed<ArJob[]>(() => {
    const sec = this.report()?.sections.find((s) => s.title === '4-ARAging');
    if (!sec) return [];
    const ix = (n: string) => sec.columns.indexOf(n);
    const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
    const jobs = new Map<string, ArJob>();
    for (const r of sec.rows) {
      const job = String(r[ix('job_no')]);
      if (!jobs.has(job)) jobs.set(job, { job, name: String(r[ix('jobnme')] ?? ''), invoices: [], totals: AR_COLUMNS.map(() => 0) });
      const j = jobs.get(job)!;
      const amounts = AR_COLUMNS.map((c) => num(r[ix(c.key)]));
      j.invoices.push({ invoice: String(r[ix('invoice_no')] ?? ''), due: (r[ix('due_date')] as string | null) ?? null, amounts });
      amounts.forEach((a, i) => (j.totals[i] += a));
    }
    return [...jobs.values()];
  });

  /** All jobs together, for the grand total row. */
  readonly arGrandTotal = computed(() => {
    const t = AR_COLUMNS.map(() => 0);
    for (const j of this.arJobs()) j.totals.forEach((v, i) => (t[i] += v));
    return t;
  });

  /** Jobs that are closed (collapsed); every job starts open. */
  readonly arCollapsed = signal<Set<string>>(new Set());

  toggleArJob(job: string): void {
    const next = new Set(this.arCollapsed());
    if (next.has(job)) next.delete(job);
    else next.add(job);
    this.arCollapsed.set(next);
  }

  setAllArJobs(open: boolean): void {
    this.arCollapsed.set(open ? new Set() : new Set(this.arJobs().map((j) => j.job)));
  }

  /** An AR amount: blank for zero, as in the mockup; otherwise $1,234.56. */
  arAmount(v: number): string {
    if (!v) return '';
    const s = Math.abs(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    return v < 0 ? `(${s})` : s;
  }
  /** Reports that are blank pages for now: Income Statement - All Departments and Monthly Balance Sheet. */
  readonly isBlankPage = computed(() => ['income-statement-all', 'balance-sheet'].includes(this.key()));

  /** AR Aging for the same period, for Over/Under's "Retainage from AR Aging" column. */
  readonly arReport = signal<MonthlyReport | null>(null);


  /** Over/Under Billings, one row per job, with retainage from AR Aging. */
  readonly overUnderRows = computed<OverUnderRow[]>(() => {
    const sec = this.report()?.sections.find((s) => s.title === '3-OverUnder');
    if (!sec) return [];
    const col = (n: string) => sec.columns.indexOf(n);
    const num = (v: unknown) => (typeof v === 'number' ? v : v === null || v === undefined ? null : Number(v));

    // retainage held per job, summed from AR Aging's invoices
    const retain = new Map<string, number>();
    const ar = this.arReport()?.sections.find((s) => s.title === '4-ARAging');
    if (ar) {
      const j = ar.columns.indexOf('job_no');
      const r = ar.columns.indexOf('retained');
      for (const row of ar.rows) {
        const key = String(row[j]);
        retain.set(key, (retain.get(key) ?? 0) + (num(row[r]) ?? 0));
      }
    }

    return sec.rows.map((r) => ({
      job: String(r[col('job_no')]),
      name: String(r[col('jobnme')] ?? ''),
      cost: num(r[col('cost')]) ?? 0,
      budget: num(r[col('budget')]) ?? 0,
      pct: num(r[col('pct_complete')]),
      contract: num(r[col('contract')]) ?? 0,
      earned: num(r[col('earned')]),
      billed: num(r[col('billed')]) ?? 0,
      overUnder: num(r[col('over_under')]),
      adjustment: null, // filled in on the page (see adjustmentFor)
      retainage: retain.has(String(r[col('job_no')])) ? retain.get(String(r[col('job_no')]))! : null,
    }));
  });

  /**
   * The figures at the top of Over/Under Billings:
   *  1. OVER  = all negative numbers from the Over/Under column (overbilled)
   *  2. UNDER = all positive numbers from the Over/Under column (underbilled)
   *  3. TOTAL = the two together, which equals the Over/Under column's total
   * Liabilities and Assets are the GL balances the report is checked against: 21000 Overbillings and
   * 11900 Underbillings.
   */
  readonly overUnderTotals = computed(() => {
    const rows = this.overUnderRows();
    const ou = rows.map((r) => r.overUnder ?? 0);
    const sum = (f: (r: OverUnderRow) => number | null) => rows.reduce((a, r) => a + (f(r) ?? 0), 0);
    const gl = this.report()?.sections.find((s) => s.title === '3-OverUnder totals vs GL');
    const glVal = (n: string) => {
      if (!gl || !gl.rows.length) return null;
      const v = gl.rows[0][gl.columns.indexOf(n)];
      return typeof v === 'number' ? v : null;
    };
    return {
      over: ou.filter((v) => v < 0).reduce((a, b) => a + b, 0),
      under: ou.filter((v) => v > 0).reduce((a, b) => a + b, 0),
      total: ou.reduce((a, b) => a + b, 0),
      liabilities: glVal('overbillings_gl_21000'),
      assets: glVal('underbillings_gl_11900'),
      cost: sum((r) => r.cost),
      budget: sum((r) => r.budget),
      contract: sum((r) => r.contract),
      earned: sum((r) => r.earned),
      billed: sum((r) => r.billed),
      retainage: sum((r) => r.retainage),
    };
  });

  /**
   * Adjustment to Net Contract Asset and Contract Liability, typed in per job. It isn't in the Financials
   * package and has no formula yet, so it's entered by hand and kept in this browser per period.
   */
  private readonly adjustments = signal<Record<string, number>>(this.readJson('stowell.overunder.adjustments', {}));

  adjustmentFor(job: string): number | null {
    return this.adjustments()[`${this.periodSvc.period()}:${job}`] ?? null;
  }

  setAdjustment(job: string, text: string): void {
    const key = `${this.periodSvc.period()}:${job}`;
    const value = Number(String(text).replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1'));
    const next = { ...this.adjustments() };
    if (text.trim() === '' || isNaN(value)) delete next[key];
    else next[key] = value;
    this.adjustments.set(next);
    this.writeJson('stowell.overunder.adjustments', next);
  }

  readonly adjustmentTotal = computed(() =>
    this.overUnderRows().reduce((a, r) => a + (this.adjustmentFor(r.job) ?? 0), 0)
  );

  // ---- Over/Under Commit ----
  /** Over/Under commits per period, kept in this browser. */
  private readonly ouCommits = signal<Record<string, { at: string; by: string }>>(this.readJson('stowell.overunder.commits', {}));
  readonly ouCommit = computed(() => this.ouCommits()[this.periodSvc.period()] ?? null);
  readonly ouCommitMessage = signal('');

  /**
   * Commit the Over/Under report for the period. The design says this should also push the figures to
   * Sage100; that isn't connected yet, because it writes to Sage's books and needs the exact entry
   * (accounts and amounts) agreed first.
   */
  commitOverUnder(): void {
    const by = this.auth.getLoggedInUserName() ?? 'Unknown user';
    const next = { ...this.ouCommits(), [this.periodSvc.period()]: { at: new Date().toISOString(), by } };
    this.ouCommits.set(next);
    this.writeJson('stowell.overunder.commits', next);
    this.ouCommitMessage.set('Committed. Pushing to Sage100 isn\'t connected yet, so nothing was sent to Sage.');
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? 'null');
      return v && typeof v === 'object' ? v : fallback;
    } catch {
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage isn't available, so this lasts until the page is left */
    }
  }

  /** Refresh Report: re-pull this report (and AR Aging's retainage) from Sage. */
  refreshReport(): void {
    this.load(true);
  }
  /** The Backlog overview: the Backlog Report itself, not one of its TAB pages. */
  readonly isBacklogOverview = computed(() => this.key() === 'backlog' && !this.tab());
  /** A Backlog tab page: Master or one division. */
  readonly isBacklogTab = computed(() => this.key() === 'backlog' && !!this.tab());
  readonly backlogNav = BACKLOG_NAV;
  readonly backlogTables = BACKLOG_TABLES;
  readonly blankRows = BLANK_ROWS;
  /** "Master", "Orlando", ... for the Backlog tab page's title. */
  readonly tabLabel = computed(() => BACKLOG_NAV.find((n) => n.tab === this.tab())?.label ?? '');
  /** Division tabs (not Master) are filled in by the PM and submitted. */
  readonly isDivisionTab = computed(() => this.isBacklogTab() && this.tab() !== 'master');

  private auth = inject(AuthService);
  /** Accounting users can unlock a submitted division (see ACCOUNTING_ROLE). */
  readonly isAccounting = ACCOUNTING_ROLE.test(this.auth.getLoggedInUserRole() ?? '');
  private readonly userName = this.auth.getLoggedInUserName() ?? 'Unknown user';

  /** Each division's state per period ("2026-06:orlando"), kept in this browser. */
  private readonly states = signal<Record<string, BacklogState>>(this.readStates());

  private stateKey(tab: string | null = this.tab()): string {
    return `${this.periodSvc.period()}:${tab}`;
  }

  /** This division's state for the period, or null while it's still being filled in. */
  readonly backlogState = computed<BacklogState | null>(() => this.states()[this.stateKey()] ?? null);
  readonly submitted = computed(() => this.backlogState()?.status === 'submitted');
  /** The PM can edit until they submit, and again after Accounting unlocks it. */
  readonly editable = computed(() => this.isDivisionTab() && !this.submitted());

  /** PM: submit the division's backlog, which locks it. */
  submitBacklog(): void {
    this.setState({ status: 'submitted', at: new Date().toISOString(), by: this.userName });
  }

  /** Accounting: reopen a submitted backlog so the PM can edit it again. */
  unlockBacklog(): void {
    if (!this.isAccounting) return;
    this.setState({ status: 'unlocked', at: new Date().toISOString(), by: this.userName });
  }

  private setState(s: BacklogState): void {
    const next = { ...this.states(), [this.stateKey()]: s };
    this.states.set(next);
    try {
      localStorage.setItem(BACKLOG_STATE_KEY, JSON.stringify(next));
    } catch {
      /* storage isn't available, so the state resets when the page is left */
    }
  }

  private readStates(): Record<string, BacklogState> {
    try {
      const v = JSON.parse(localStorage.getItem(BACKLOG_STATE_KEY) ?? '{}');
      return v && typeof v === 'object' ? v : {};
    } catch {
      return {};
    }
  }

  /** A division's state for the current period (used by the Overview). */
  divisionState(tab: string): BacklogState | null {
    return this.states()[this.stateKey(tab)] ?? null;
  }


  /**
   * The Backlog overview's rows. A division is Completed once its PM has submitted it for the period,
   * otherwise Pending. There's no backlog data source yet, so the amounts are empty until one exists.
   */
  readonly backlogRows = computed<BacklogRow[]>(() =>
    DIVISIONS.map((d) => {
      const sample = this.sampleMode ? SAMPLE_BACKLOG_OVERVIEW[d.tab] : undefined;
      const submitted = this.divisionState(d.tab)?.status === 'submitted';
      return {
        ...d,
        status: submitted ? 'Completed' : sample?.status ?? 'Pending',
        completed: submitted ? this.divisionState(d.tab)!.at : sample?.completed ?? null,
        revenueYtd: sample?.revenueYtd ?? null,
        profitYtd: sample?.profitYtd ?? null,
        revenueFuture: sample?.revenueFuture ?? null,
        profitFuture: sample?.profitFuture ?? null,
      };
    })
  );

  /** True while the pages show sample figures instead of the API's (see environment.ts). */
  readonly sampleMode = this.reporting.sampleMode;

  /** The rows of one Backlog table (0 or 1) for this tab: every division on Master, one division otherwise. */
  tableRows(table: 0 | 1): string[][] {
    if (!this.sampleMode) return [];
    const tab = this.tab();
    return sampleBacklogJobs()
      .filter((j) => tab === 'master' || j.tab === tab)
      .map((j) => (table === 0 ? j.table1 : j.table2));
  }

  /** Overall projected revenue and profit, this year and future years, with profit as a share of revenue. */
  readonly backlogTotals = computed(() => {
    const rows = this.backlogRows();
    const total = (pick: (r: BacklogRow) => number | null) => {
      const vals = rows.map(pick).filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    };
    const pct = (profit: number | null, revenue: number | null) => (profit !== null && revenue ? (profit / revenue) * 100 : null);
    const revenueYtd = total((r) => r.revenueYtd);
    const profitYtd = total((r) => r.profitYtd);
    const revenueFuture = total((r) => r.revenueFuture);
    const profitFuture = total((r) => r.profitFuture);
    return {
      revenueYtd,
      revenueFuture,
      profitYtd,
      profitFuture,
      revenueYtdPct: null as number | null,
      revenueFuturePct: null as number | null,
      profitYtdPct: pct(profitYtd, revenueYtd),
      profitFuturePct: pct(profitFuture, revenueFuture),
    };
  });

  /** Profit as a share of revenue for one row, or null when either is missing. */
  margin(profit: number | null, revenue: number | null): number | null {
    return profit !== null && revenue ? (profit / revenue) * 100 : null;
  }
  readonly title = computed(() => {
    const t = TITLES[this.key()] ?? 'Monthly Financials';
    const tab = this.tab();
    return tab ? `${t} – TAB-${tab.charAt(0).toUpperCase()}${tab.slice(1)}` : t;
  });

  readonly report = signal<MonthlyReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly downloading = signal(false);

  // ---- Commit ----
  readonly committing = signal(false);
  /** What the last Commit on this page found missing (null until Commit is clicked). */
  readonly checkResult = signal<string[] | null>(null);

  readonly sections = computed(() =>
    (this.report()?.sections ?? []).map((s) => ({
      name: sectionName(s.title),
      columns: s.columns.map(heading),
      rows: s.rows,
      /** Which columns hold numbers, so they can be right-aligned and formatted. */
      numeric: s.columns.map((_, i) => s.rows.some((r) => typeof r[i] === 'number')),
      /** Rows that are totals ("Total ...", "GRAND TOTAL"), shown in bold. */
      totals: s.rows.map((r) => r.some((v) => typeof v === 'string' && /^(total|grand total)/i.test(v))),
    }))
  );

  /** The statement's lines with their amounts for the chosen year (year to date through the period). */
  /**
   * The statement's lines with their amounts for the chosen year (year to date through the period).
   * Every line is always listed; an amount is null (an empty box) until the figures have loaded.
   */
  /** The Statement of Income's current and prior year, from the 5b-FS Income & RE section. */
  readonly stmtYears = computed(() => statementYears(this.report(), this.periodSvc.year()));

  /** The prior-year column is a full year, so it only compares fairly with a current year that is also complete (December). */
  readonly likeForLike = computed(() => this.periodSvc.month() === 12);

  readonly statement = computed(() => {
    const { cur } = this.stmtYears();
    const prior = this.likeForLike() ? this.stmtYears().prior : null;
    const val = (row: Record<string, unknown> | null, col?: string) => (row && col ? Number(row[col] ?? 0) : null);
    return STATEMENT_LINES.map((l) => {
      const value = val(cur, l.col);
      const before = val(prior, l.col);
      return { ...l, value, prior: before, change: l.col ? change(value, before) : null };
    });
  });

  // ---- Charts (see visuals/mf-data.ts) ----
  readonly stmtKpis = computed(() => statementKpis(this.stmtYears().cur, this.likeForLike() ? this.stmtYears().prior : null));
  readonly stmtSteps = computed(() => statementSteps(this.stmtYears().cur));

  /** The Statement of Income for the same period, which the Overview's widgets use alongside the balance sheet. */
  readonly ovIncome = signal<MonthlyReport | null>(null);
  private readonly ovYears = computed(() => statementYears(this.ovIncome(), this.periodSvc.year()));
  readonly ovKpis = computed(() => statementKpis(this.ovYears().cur, this.likeForLike() ? this.ovYears().prior : null));
  readonly ovSteps = computed(() => statementSteps(this.ovYears().cur));
  readonly ouViz = computed(() => overUnderViz(this.overUnderRows(), { liabilities: this.overUnderTotals().liabilities, assets: this.overUnderTotals().assets }));
  readonly arV = computed(() => arViz(this.arJobs(), this.arGrandTotal()));
  readonly blV = computed(() => backlogViz(this.backlogRows()));
  readonly incV = computed(() => incomeViz(this.report(), this.periodSvc.year()));
  readonly balV = computed(() => balanceViz(this.report()));

  /** $1,234 with negatives in brackets (a blank for no number). */
  money(n: number | null | undefined): string {
    return fullMoney(n);
  }

  short(n: number | null | undefined): string {
    return shortMoney(n);
  }

  /** The percent change as "+12%" or "-3.4%". */
  changeText(c: number | null): string {
    return c === null ? '' : `${c >= 0 ? '+' : ''}${Math.abs(c) < 10 ? c.toFixed(1) : c.toFixed(0)}%`;
  }

  /**
   * Whether an income statement line is on the right side of its budget. Income sections should be at or
   * above budget; expense sections at or below it.
   */
  varClass(section: string, actual: number | null, budget: number | null): string {
    if (actual === null || budget === null || budget === 0) return '';
    const income = /income/i.test(section);
    return (income ? actual >= budget : actual <= budget) ? 'good' : 'bad';
  }

  /** True once there are figures for the chosen period. */
  readonly hasFigures = computed(() => this.statement().some((l) => l.value !== null));

  private firstRun = true;

  constructor() {
    // reload whenever the module's period changes (the first load comes from ngOnInit)
    effect(() => {
      this.periodSvc.period();
      if (this.firstRun) {
        this.firstRun = false;
        return;
      }
      untracked(() => {
        this.checkResult.set(null);
        this.load();
      });
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      this.key.set(this.route.snapshot.data['report'] ?? p.get('report') ?? '');
      this.tab.set(p.get('tab'));
      this.load();
    });
  }

  onPeriod(value: string): void {
    this.periodSvc.setPeriod(value);
  }

  load(refresh = false): void {
    const y = this.periodSvc.year();
    const m = this.periodSvc.month();
    if (!y || !m || !this.key()) return;
    this.loading.set(true);
    this.error.set('');
    if (this.key() === 'over-under') {
      // AR Aging is in the same package, so this is quick after the main report
      this.arReport.set(null);
      this.reporting.getMonthlyReport('ar-aging', y, m).subscribe({ next: (r) => this.arReport.set(r), error: () => this.arReport.set(null) });
    }
    if (this.isOverview()) {
      // the widgets use the YTD Statement of Income too (same package, so it's quick after the balance sheet)
      this.ovIncome.set(null);
      this.reporting.getMonthlyReport('statement-of-income', y, m).subscribe({ next: (r) => this.ovIncome.set(r), error: () => this.ovIncome.set(null) });
    }
    // the Overview and YTD Balance Sheet are summaries of the balance sheet report
    const dataKey = this.isOverview() || this.isYtdBalance() ? 'balance-sheet' : this.key();
    this.reporting.getMonthlyReport(dataKey, y, m, refresh).subscribe({
      next: (r) => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.report.set(null);
        this.loading.set(false);
        this.error.set(
          e?.status === 404
            ? "This report isn't available from the API yet. Restart the API so it picks up the new endpoint."
            : 'Could not run the report. The Sage (StowellCompany) database may not be reachable from the API.'
        );
      },
    });
  }

  /**
   * Commit: fixes the period for the module and checks that every report in the package is there.
   * For now the check is the Backlog report and its tabs, which aren't in the package yet.
   */
  commit(): void {
    if (this.committing()) return;
    // every division's backlog has been submitted for this period, so nothing is missing
    if (this.backlogsDone(this.periodSvc.period())) {
      this.finishCommit([]);
      return;
    }
    this.committing.set(true);
    this.reporting.getMonthlyReport('backlog', this.periodSvc.year(), this.periodSvc.month()).subscribe({
      next: (r) => this.finishCommit(r.available ? [] : ['Backlog Report', ...BACKLOG_TABS.map((t) => `TAB-${t}`)]),
      // if the API can't answer, treat Backlog as missing rather than passing the check
      error: () => this.finishCommit(['Backlog Report', ...BACKLOG_TABS.map((t) => `TAB-${t}`)]),
    });
  }

  private finishCommit(missing: string[]): void {
    this.periodSvc.commitPeriod(missing);
    this.checkResult.set(missing);
    this.committing.set(false);
  }

  download(): void {
    const y = this.periodSvc.year();
    const m = this.periodSvc.month();
    if (!y || !m || this.downloading()) return;
    if (this.sampleMode) {
      this.error.set('Sample data is on, so there is no real Excel file to download yet.');
      return;
    }
    this.downloading.set(true);
    this.reporting.downloadMonthlyReport(this.key(), y, m).subscribe({
      next: (res) => {
        const url = URL.createObjectURL(res.body as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${y} - ${new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' })} ${TITLES[this.key()] ?? 'Report'}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => {
        this.downloading.set(false);
        this.error.set('Could not create the Excel file. Please try again.');
      },
    });
  }

  /** Numbers as 1,234.56, dates as 6/30/2026, everything else as text. */
  cell(v: string | number | null, numeric: boolean): string {
    if (v === null || v === undefined) return '';
    if (numeric && typeof v === 'number') return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString('en-US');
    return String(v);
  }

  /** A statement amount as $1,234,567 (negatives in brackets). */
  amount(v: number | null): string {
    if (v === null) return '';
    const s = Math.abs(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    return v < 0 ? `(${s})` : s;
  }

  isNegative(v: string | number | null): boolean {
    return typeof v === 'number' && v < 0;
  }
}
