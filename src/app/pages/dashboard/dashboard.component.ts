import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrentJobsComponent } from './components/current-jobs/current-jobs.component';
import { CashCollectedChartComponent } from './components/cash-collected-chart/cash-collected-chart.component';
import { RevenueLineChartComponent } from './components/revenue-line-chart/revenue-line-chart.component';
import { NetCashChartComponent } from './components/net-cash-chart/net-cash-chart.component';
import { RetainStackedChartComponent } from './components/retain-stacked-chart/retain-stacked-chart.component';
import { CalendarWidgetComponent } from './components/calendar-widget/calendar-widget.component';
import { DashboardCardComponent } from '../../shared/ui/dashboard-card/dashboard-card.component';
import { CountUpDirective } from '../../shared/ui/count-up/count-up.directive';
import { AuthService } from '../../core/services/auth.service';
import { JobService } from '../../core/services/job.service';
import { PoQueueService } from '../../core/services/po-queue.service';
import { CoQueueService } from '../../core/services/co-queue.service';
import { CurrentJob } from '../../core/models/current-job.model';
import { PoQueueRecord } from '../../core/models/project-management/po-queue.model';
import { CoQueueRecord } from '../../core/models/project-management/co-queue.model';

interface QuickAction {
  label: string;
  hint: string;
  icon: string;
  route: string;
}

interface PipelineSlice {
  status: string;
  count: number;
  color: string;
  dash: string;
  offset: number;
}

interface ActionItem {
  kind: 'PO' | 'CO';
  id: string;
  job: string;
  meta: string;
  route: string;
}

const PIPELINE_COLORS = ['#2563c9', '#f26b2a', '#14915b', '#6f9be0', '#8492a8'];
const NO_STATUS_COLOR = '#c9d3e3';
const DONUT_RADIUS = 56;
const GAUGE_RADIUS = 54;
const GAUGE_ARC = 0.75 * 2 * Math.PI * GAUGE_RADIUS; // a 270 degree dial

interface Spark {
  line: string;
  area: string;
  last: { x: number; y: number };
}

/** smooth line + filled area for a small trend graphic (null when there are fewer than two points) */
function sparkline(values: number[], w = 120, h = 38): Spark | null {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({ x: 2 + (i * (w - 4)) / (values.length - 1), y: h - 5 - ((v - min) / span) * (h - 10) }));
  let line = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const cx = (a.x + b.x) / 2;
    line += ` C${cx.toFixed(1)} ${a.y.toFixed(1)} ${cx.toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return { line, area: `${line} L${last.x.toFixed(1)} ${h} L${pts[0].x.toFixed(1)} ${h} Z`, last };
}

// Ported from Dashboard.razor and Dashboard.razor.cs.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    CurrentJobsComponent,
    CashCollectedChartComponent,
    RevenueLineChartComponent,
    NetCashChartComponent,
    RetainStackedChartComponent,
    CalendarWidgetComponent,
    DashboardCardComponent,
    CountUpDirective,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private jobService = inject(JobService);
  private poQueue = inject(PoQueueService);
  private coQueue = inject(CoQueueService);

  readonly today = new Date();
  readonly firstName = (this.auth.getLoggedInUserName() ?? '').split(' ')[0] || 'there';
  readonly greeting = this.today.getHours() < 12 ? 'Good morning' : this.today.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  readonly jobs = signal<CurrentJob[]>([]);
  readonly cashCollected = signal<number | null>(null);
  readonly openPos = signal<PoQueueRecord[]>([]);
  readonly openCos = signal<CoQueueRecord[]>([]);

  /** per-job cash figures behind the Cash collected card, the gauge and the insights */
  readonly cashJobs = signal<{ job: string; collected: number; paid: number }[]>([]);
  /** retention held per file */
  readonly retainFiles = signal<{ file: string; value: number }[]>([]);

  readonly cashPaidTotal = computed(() => this.cashJobs().reduce((n, c) => n + c.paid, 0));
  readonly retainTotal = computed(() => this.retainFiles().reduce((n, r) => n + r.value, 0));
  /** share of the collected cash that has been paid out (0-100) */
  readonly paidRatio = computed(() => {
    const collected = this.cashCollected();
    return collected ? Math.min(100, (this.cashPaidTotal() / collected) * 100) : 0;
  });
  readonly netCash = computed(() => (this.cashCollected() ?? 0) - this.cashPaidTotal());

  readonly cashSpark = computed(() => sparkline(this.cashJobs().map((c) => c.collected)));
  readonly retainSpark = computed(() => sparkline(this.retainFiles().map((r) => r.value)));

  /** gauge dial: length of the filled arc (animated in CSS) and of the full track */
  readonly gaugeTrack = GAUGE_ARC;
  readonly gaugeFill = computed(() => (this.paidRatio() / 100) * GAUGE_ARC);
  readonly gaugeRadius = GAUGE_RADIUS;

  /** the five files holding the most retention, with a bar length relative to the largest */
  readonly topRetain = computed(() => {
    const top = [...this.retainFiles()].sort((a, b) => b.value - a.value).slice(0, 5);
    const max = top[0]?.value || 1;
    return top.map((r) => ({ ...r, pct: (r.value / max) * 100 }));
  });

  /** donut: the status being hovered (legend or slice) */
  readonly hoveredStatus = signal<string | null>(null);
  readonly hoveredSlice = computed(() => this.pipeline().find((p) => p.status === this.hoveredStatus()) ?? null);

  /** plain-language findings drawn from the numbers above */
  readonly insights = computed(() => {
    const out: { icon: string; text: string }[] = [];
    const cash = this.cashJobs();
    const collected = this.cashCollected() ?? 0;
    if (cash.length && collected) {
      const top = [...cash].sort((a, b) => b.collected - a.collected)[0];
      out.push({ icon: 'bi-cash-coin', text: `${top.job} brings in ${Math.round((top.collected / collected) * 100)}% of the cash collected (${this.short(top.collected)}).` });
    }
    const files = this.topRetain();
    if (files.length) {
      out.push({ icon: 'bi-safe', text: `${this.retainFiles().length} files hold ${this.short(this.retainTotal())} in retention; file ${files[0].file} is the largest at ${this.short(files[0].value)}.` });
    }
    if (this.jobs().length) {
      const complete = this.jobs().filter((j) => /^complete/i.test(j.status?.trim() ?? '')).length;
      out.push({ icon: 'bi-diagram-3', text: `${this.currentCount()} of ${this.jobs().length} jobs are in progress and ${complete} are complete.` });
    }
    const po = this.openPos().length;
    const co = this.openCos().length;
    if (po || co) {
      out.push({ icon: 'bi-receipt', text: `${po.toLocaleString('en-US')} purchase ${po === 1 ? 'order' : 'orders'} and ${co.toLocaleString('en-US')} change ${co === 1 ? 'order' : 'orders'} are still active.` });
    }
    return out;
  });
  /** the job shown in the details panel */
  readonly selectedJob = signal<CurrentJob | null>(null);

  readonly selectedOrders = computed(() => {
    const j = this.selectedJob();
    if (!j) return [];
    const same = (name: string) => name === j.jobName;
    return [
      ...this.openPos().filter((p) => same(p.jobName)).map((p) => ({ kind: 'PO', id: p.masterJobPoId, status: p.poStatus })),
      ...this.openCos().filter((c) => same(c.jobName)).map((c) => ({ kind: 'CO', id: c.masterJobCoId, status: c.poStatus })),
    ];
  });

  /** every job lacks a status, so the donut has nothing to break down */
  readonly statusUnset = computed(() => this.jobs().length > 0 && this.jobs().every((j) => !j.status?.trim()));

  /** jobs whose Sage status is Current (in progress) */
  readonly currentCount = computed(() => this.jobs().filter((j) => /^current$/i.test(j.status?.trim() ?? '')).length);

  /** jobs grouped by status for the pipeline donut (top four statuses, the rest as "Other") */
  readonly pipeline = computed<PipelineSlice[]>(() => {
    const counts = new Map<string, number>();
    for (const j of this.jobs()) {
      const s = j.status?.trim() || 'No status';
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4).reduce((n, [, c]) => n + c, 0);
    if (rest) top.push(['Other', rest]);

    const total = this.jobs().length || 1;
    const circumference = 2 * Math.PI * DONUT_RADIUS;
    let offset = 0;
    let next = 0;
    return top.map(([status, count]) => {
      const len = (count / total) * circumference;
      const slice = { status, count, color: status === 'No status' ? NO_STATUS_COLOR : PIPELINE_COLORS[next++ % PIPELINE_COLORS.length], dash: `${Math.max(len - 3, 1)} ${circumference - len + 3}`, offset: -offset };
      offset += len;
      return slice;
    });
  });

  /** oldest-listed active purchase and change orders, each linking to its queue */
  readonly actionItems = computed<ActionItem[]>(() => [
    ...this.openPos().slice(0, 4).map<ActionItem>((p) => ({ kind: 'PO', id: p.masterJobPoId, job: p.jobName, meta: `${p.poStatus} · ${p.pm}`, route: '/project-management/po-queue' })),
    ...this.openCos().slice(0, 3).map<ActionItem>((c) => ({ kind: 'CO', id: c.masterJobCoId, job: c.jobName, meta: `${c.poStatus} · ${c.pm}`, route: '/project-management/co-queue' })),
  ]);

  readonly donutRadius = DONUT_RADIUS;

  readonly quickActions: QuickAction[] = [
    { label: 'Project Queue', hint: 'Jobs in progress', icon: 'bi-diagram-3', route: '/project-queue' },
    { label: 'PO Queue', hint: 'Purchase orders', icon: 'bi-receipt', route: '/project-management/po-queue' },
    { label: 'Invoice Queue', hint: 'Accounting review', icon: 'bi-cash-coin', route: '/accounting/invoice-queue' },
    { label: 'Reports', hint: 'Dashboards and exports', icon: 'bi-graph-up-arrow', route: '/reporting-dashboard' },
  ];

  @HostListener('document:keydown.escape')
  closeJob(): void {
    this.selectedJob.set(null);
  }

  ngOnInit(): void {
    const email = this.auth.getLoggedInUserEmail();
    if (email) this.jobService.getCurrentJobs(email).subscribe((jobs) => this.jobs.set(jobs));

    this.jobService.getCashCollectedDatasets().subscribe((sets) => {
      const chart = sets[0];
      const collected = chart?.datasets.find((d) => d.label === 'Cash Collected');
      const paid = chart?.datasets.find((d) => d.label === 'Cash Paid');
      this.cashCollected.set(collected ? collected.data.reduce((a, b) => a + (b ?? 0), 0) : null);
      this.cashJobs.set((chart?.labels ?? []).map((job, i) => ({ job, collected: collected?.data[i] ?? 0, paid: paid?.data[i] ?? 0 })));
    });

    if (email) {
      this.jobService.getSampleChartDatasets(email).subscribe((sets) => {
        const chart = sets[0];
        const values = chart?.datasets?.[0]?.data ?? [];
        this.retainFiles.set((chart?.labels ?? []).map((file, i) => ({ file: String(file), value: values[i] ?? 0 })));
      });
    }

    this.poQueue.getPoQueueData().subscribe((d) => this.openPos.set(d?.activePOs ?? []));
    this.coQueue.getCoQueueData().subscribe((d) => this.openCos.set(d?.activeCOs ?? []));
  }

  /** $1.24M / $48K / $900 */
  short(n: number | null): string {
    if (n === null) return '–';
    const abs = Math.abs(n);
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
    return `$${Math.round(n)}`;
  }
}
