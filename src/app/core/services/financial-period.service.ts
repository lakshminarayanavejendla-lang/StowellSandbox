import { Injectable, computed, signal } from '@angular/core';

const PERIOD_KEY = 'stowell.financials.period';
const COMMIT_KEY = 'stowell.financials.commit';

/** A committed period and what the checks found when it was committed. */
export interface FinancialCommit {
  period: string;
  at: string;
  missing: string[];
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage isn't available, so the choice lasts until the page is left */
  }
}

/** Last month as 'YYYY-MM'. */
function priorMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * The period for the whole Monthly Financials module. The Statement of Income's date controls it, and
 * every Monthly Financials report and the Financials ALL download use it. The choice, and the last
 * Commit, are kept in this browser (nothing is saved on the server).
 */
@Injectable({ providedIn: 'root' })
export class FinancialPeriodService {
  /** The period as 'YYYY-MM'. Defaults to last month. */
  readonly period = signal<string>(/^\d{4}-\d{2}$/.test(read(PERIOD_KEY) ?? '') ? read(PERIOD_KEY)! : priorMonth());

  readonly year = computed(() => Number(this.period().split('-')[0]));
  readonly month = computed(() => Number(this.period().split('-')[1]));

  /** The last day of the period, such as June 30, 2026. */
  readonly periodEnd = computed(() => new Date(this.year(), this.month(), 0));

  /** January 1 of the period's year: the start of the year-to-date statements. */
  readonly yearStart = computed(() => new Date(this.year(), 0, 1));

  /** "June 2026". */
  readonly label = computed(() => this.periodEnd().toLocaleString('en-US', { month: 'long', year: 'numeric' }));

  /** Every committed month, by period ('YYYY-MM'), so each month can be committed and unlocked on its own. */
  readonly commits = signal<Record<string, FinancialCommit>>(this.readCommits());

  /** The Commit for the current period, or null while it's open. */
  readonly commit = computed<FinancialCommit | null>(() => this.commits()[this.period()] ?? null);

  /** Whether the current period has been committed. */
  readonly committed = computed(() => this.commit() !== null);

  /** Whether the given period ('YYYY-MM') has been committed. */
  isCommitted(period: string): boolean {
    return !!this.commits()[period];
  }

  /** The last 36 month ends, newest first, for the period picker. */
  readonly choices = computed(() => {
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 36; i++) {
      const end = new Date(now.getFullYear(), now.getMonth() - i, 0);
      out.push({
        value: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`,
        label: end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });
    }
    return out;
  });

  setPeriod(value: string): void {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    this.period.set(value);
    write(PERIOD_KEY, value);
  }

  /** Records the Commit for the current period, with whatever the checks found missing. */
  commitPeriod(missing: string[]): void {
    const c: FinancialCommit = { period: this.period(), at: new Date().toISOString(), missing };
    this.saveCommits({ ...this.commits(), [c.period]: c });
  }

  /** Reopens a committed period (Accounting only; the page checks that). Defaults to the current period. */
  unlock(period: string = this.period()): void {
    const next = { ...this.commits() };
    delete next[period];
    this.saveCommits(next);
  }

  private saveCommits(next: Record<string, FinancialCommit>): void {
    this.commits.set(next);
    write(COMMIT_KEY, JSON.stringify(next));
  }

  /** Reads the saved Commits. Older versions saved just the latest one, which is carried over. */
  private readCommits(): Record<string, FinancialCommit> {
    try {
      const v = JSON.parse(read(COMMIT_KEY) ?? 'null');
      if (v && typeof v.period === 'string') return { [v.period]: v };
      return v && typeof v === 'object' ? v : {};
    } catch {
      return {};
    }
  }
}
