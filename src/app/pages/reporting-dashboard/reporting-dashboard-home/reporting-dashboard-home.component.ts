import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReportingService } from '../../../core/services/reporting.service';
import { FinancialPeriodService } from '../../../core/services/financial-period.service';

type Category = 'Accounting' | 'Cash flow' | 'Project Management';

interface Report {
  key: string;
  name: string;
  description: string;
  category: Category;
  icon: string;
  /** What the user chooses on the report page. */
  picks: string;
  /** How it can be exported. */
  exports: string;
  /** Router link, or null when openReport() handles it. */
  link: unknown[] | null;
}

const FAVORITES_KEY = 'stowell.reports.favorites';
const RECENT_KEY = 'stowell.reports.recent';

function readList(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage isn't available, so the list just isn't kept */
  }
}

/**
 * The Reports landing page (/ReportingDashboard in Blazor), where the menu's Reports link goes. It's
 * a report library: search, category filters, favourites
 * and recently opened reports (both kept in this browser), and a card for each report saying what it
 * shows and what you pick.
 *
 * Two reports open Project Management's pages, as in Blazor:
 *  - Cash Flow Report opens 'project-management/cash-flow-report/:projectId' with project 0 (none chosen).
 *  - Job Cost Summary opens this module's CostCodeSummaryReportComponent, unless localStorage has a
 *    `defaultJobId`, in which case it opens that job's /project-management/cost-code-summary/{id}.
 *
 * The Job Cost Journal and Power BI Budget Report links are hidden in Blazor, so they aren't ported.
 */
@Component({
  selector: 'app-reporting-dashboard-home',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reporting-dashboard-home.component.html',
  styleUrl: './reporting-dashboard-home.component.scss',
})
export class ReportingDashboardHomeComponent implements AfterViewInit {
  constructor(
    private router: Router,
    private reporting: ReportingService,
    private cdr: ChangeDetectorRef
  ) {}

  private route = inject(ActivatedRoute);
  private host: ElementRef<HTMLElement> = inject(ElementRef);

  /** Set by the route (Reports > Monthly Financials – All): the page then shows only that report. */
  readonly only = signal<string | null>(this.route.snapshot.data['focus'] ?? null);

  ngAfterViewInit(): void {
    if (!this.only()) return;
    // put the cursor in the month picker, ready to choose a period
    requestAnimationFrame(() => this.host.nativeElement.querySelector<HTMLInputElement>('input[type="month"]')?.focus());
  }

  readonly reports: Report[] = [
    {
      key: 'monthly-financials',
      name: 'Monthly Financials',
      description: 'The full "Financials ALL" Excel workbook for one accounting period.',
      category: 'Accounting',
      icon: 'bi-file-earmark-excel',
      picks: 'Accounting period',
      exports: 'Excel download',
      link: null,
    },
    {
      key: 'cost-code-summary',
      name: 'Job Cost Summary',
      description: 'Budget and changes, cost to date, this period, open POs and remaining budget for each cost code on a job.',
      category: 'Accounting',
      icon: 'bi-currency-dollar',
      picks: 'Job, cost code, phase, dates',
      exports: 'PDF · Excel · Word · CSV',
      link: null,
    },
    {
      key: 'contract-summary',
      name: 'Contract Summary',
      description: 'Original contract, changes, invoiced to date and the balance left on a job\'s contract.',
      category: 'Accounting',
      icon: 'bi-file-earmark-text',
      picks: 'Job',
      exports: 'PDF · Excel · Word · CSV',
      link: ['/reporting-dashboard/contract-summary'],
    },
    {
      key: 'invoice-receivable',
      name: 'Invoice Receivable',
      description: 'A job\'s invoices with what was requested, paid and still owed, including retention.',
      category: 'Accounting',
      icon: 'bi-receipt',
      picks: 'Job',
      exports: 'PDF · Excel · Word · CSV',
      link: ['/reporting-dashboard/invoice-receivable'],
    },
    {
      key: 'ar-invoice-list',
      name: 'AR Invoice List',
      description: 'Every receivable invoice on a job, with its due date, total and balance.',
      category: 'Accounting',
      icon: 'bi-list-ul',
      picks: 'Job',
      exports: 'PDF · Excel · Word · CSV',
      link: ['/reporting-dashboard/ar-invoice-list'],
    },
    {
      key: 'prime-change-list',
      name: 'Prime Change List',
      description: 'Prime contract change orders on a job, with requested and approved amounts.',
      category: 'Accounting',
      icon: 'bi-arrow-left-right',
      picks: 'Job',
      exports: 'PDF · Excel · Word · CSV',
      link: ['/reporting-dashboard/prime-change-list'],
    },
    {
      key: 'cash-flow-report',
      name: 'Cash Flow Report',
      description: 'Cash collected and paid, A/R and A/P balances and net cash for a job over a date range.',
      category: 'Cash flow',
      icon: 'bi-cash-stack',
      picks: 'Status, job, dates',
      exports: 'CSV · Copy',
      link: ['/project-management/cash-flow-report', 0],
    },
    {
      key: 'cash-flow-to-date',
      name: 'Cash Flow To Date',
      description: 'The same cash flow figures for several jobs at once, over a date range.',
      category: 'Cash flow',
      icon: 'bi-collection',
      picks: 'Status, jobs, dates',
      exports: 'PDF · Excel · Word · CSV',
      link: ['/reporting-dashboard/cash-flow-to-date'],
    },
    {
      key: 'cash-flow-forecast',
      name: 'Cash Flow Forecast',
      description: 'Budget and contract forecast by month for every job, against what has been spent and billed.',
      category: 'Cash flow',
      icon: 'bi-graph-up-arrow',
      picks: 'All jobs (search to narrow)',
      exports: 'PDF · Excel · Word',
      link: ['/reporting-dashboard/cash-flow-forecast'],
    },
    {
      key: 'job-summary',
      name: 'Job Summary Report',
      description: 'Budget and changes, cost to date, this period and remaining budget for each cost code on a job.',
      category: 'Project Management',
      icon: 'bi-clipboard-data',
      picks: 'Job',
      exports: 'PDF · Excel · Word · CSV',
      link: ['/reporting-dashboard/job-summary-report'],
    },
  ];

  readonly categories: ('All' | Category)[] = ['All', 'Accounting', 'Cash flow', 'Project Management'];
  readonly category = signal<'All' | Category>('All');
  readonly search = signal('');
  readonly favorites = signal<string[]>(readList(FAVORITES_KEY));
  readonly recent = signal<string[]>(readList(RECENT_KEY));

  readonly countFor = (c: 'All' | Category) => (c === 'All' ? this.reports.length : this.reports.filter((r) => r.category === c).length);

  /** Reports that match the search and the chosen category, favourites first. */
  readonly shown = computed(() => {
    const only = this.only();
    if (only) return this.reports.filter((r) => r.key === only);
    const term = this.search().trim().toLowerCase();
    const fav = new Set(this.favorites());
    return this.reports
      .filter((r) => this.category() === 'All' || r.category === this.category())
      .filter((r) => !term || [r.name, r.description, r.category, r.picks].some((f) => f.toLowerCase().includes(term)))
      .sort((a, b) => Number(fav.has(b.key)) - Number(fav.has(a.key)));
  });

  /** Favourite reports, in the order they were starred. */
  /** The report shown on its own, for the header. */
  readonly onlyReport = computed(() => this.reports.find((r) => r.key === this.only()) ?? null);

  readonly favoriteReports = computed(() => this.favorites().map((k) => this.reports.find((r) => r.key === k)).filter((r): r is Report => !!r));

  /** The last few reports opened, newest first. */
  readonly recentReports = computed(() => this.recent().map((k) => this.reports.find((r) => r.key === k)).filter((r): r is Report => !!r).slice(0, 4));

  isFavorite(r: Report): boolean {
    return this.favorites().includes(r.key);
  }

  toggleFavorite(r: Report, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const list = this.isFavorite(r) ? this.favorites().filter((k) => k !== r.key) : [...this.favorites(), r.key];
    this.favorites.set(list);
    writeList(FAVORITES_KEY, list);
  }

  /** Opens a report and remembers it under "Recently opened". */
  openReport(r: Report): void {
    const list = [r.key, ...this.recent().filter((k) => k !== r.key)].slice(0, 8);
    this.recent.set(list);
    writeList(RECENT_KEY, list);
    if (r.key === 'monthly-financials') {
      this.downloadMonthlyFinancials();
    } else if (r.key === 'cost-code-summary') {
      this.openCostCodeSummary();
    } else if (r.link) {
      this.router.navigate(r.link as unknown[]);
    }
  }

  // ---- Monthly Financials ----

  private periodSvc = inject(FinancialPeriodService);

  /** The Monthly Financials period as 'YYYY-MM', shared with every Monthly Financials report. */
  get financialsMonth(): string {
    return this.periodSvc.period();
  }
  set financialsMonth(value: string) {
    this.periodSvc.setPeriod(value);
  }
  financialsBusy = false;
  financialsMessage = '';
  financialsOk = false;

  /** "September 2026" for the chosen period. */
  get financialsLabel(): string {
    const [y, m] = this.financialsMonth.split('-').map(Number);
    return y && m ? new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : '';
  }

  /** Builds the "Financials ALL" workbook for the chosen month (last month by default) and downloads it. */
  downloadMonthlyFinancials(): void {
    const [y, m] = this.financialsMonth.split('-').map(Number);
    if (!y || !m || this.financialsBusy) return;
    if (this.reporting.sampleMode) {
      this.financialsOk = false;
      this.financialsMessage = 'Sample data is on, so there is no real workbook to download yet.';
      return;
    }

    this.financialsBusy = true;
    this.financialsOk = false;
    this.financialsMessage = 'Generating the workbook…';
    this.reporting.downloadMonthlyFinancials(y, m).subscribe({
      next: (res) => {
        const name = `${y} - ${new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' })} Financials ALL.xlsx`;
        const url = URL.createObjectURL(res.body as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        this.financialsBusy = false;
        this.financialsOk = true;
        this.financialsMessage = `Downloaded ${name}.`;
        this.cdr.detectChanges();
      },
      error: () => {
        this.financialsBusy = false;
        this.financialsMessage = 'Could not generate the monthly financials report. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  openCostCodeSummary(): void {
    const defaultJobId = localStorage.getItem('defaultJobId');
    if (defaultJobId) {
      this.router.navigate(['/project-management/cost-code-summary', defaultJobId]);
    } else {
      this.router.navigate(['/reporting-dashboard/cost-code-summary-report']);
    }
  }
}
