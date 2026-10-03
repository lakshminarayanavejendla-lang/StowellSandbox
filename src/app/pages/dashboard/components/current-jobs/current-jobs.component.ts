import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobService } from '../../../../core/services/job.service';
import { CurrentJob } from '../../../../core/models/current-job.model';
import { AuthService } from '../../../../core/services/auth.service';

const PAGE_SIZE = 8;

/**
 * Current jobs: a light searchable list (job id link + name, status pill) with simple paging. Choosing a row (not its Job ID link, which
 * opens the project overview) emits `jobSelected` so the dashboard can show that job in its details panel.
 * Was a Syncfusion grid ported from CurrentJobs.razor / DashboardCurrentJobs.razor; the list keeps the same search fields.
 */
@Component({
  selector: 'app-current-jobs',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './current-jobs.component.html',
  styleUrl: './current-jobs.component.scss',
})
export class CurrentJobsComponent implements OnInit {
  private jobService = inject(JobService);
  private authService = inject(AuthService);

  readonly jobSelected = output<CurrentJob>();

  readonly jobs = signal<CurrentJob[]>([]);
  readonly searchTerm = signal('');
  readonly page = signal(0);

  readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.jobs();
    return !term ? all : all.filter((j) => [j.jobID, j.jobName, j.address, j.createdBy, j.status].some((f) => f?.toLowerCase().includes(term)));
  });

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly rows = computed(() => this.filtered().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));
  readonly rangeLabel = computed(() => {
    const n = this.filtered().length;
    if (!n) return '0 jobs';
    const from = this.page() * PAGE_SIZE + 1;
    return `${from}–${Math.min(n, from + PAGE_SIZE - 1)} of ${n}`;
  });

  ngOnInit(): void {
    const email = this.authService.getLoggedInUserEmail();
    if (!email) return;
    this.jobService.getCurrentJobs(email).subscribe((jobs) => this.jobs.set(jobs));
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.page.set(0);
  }

  go(delta: number): void {
    this.page.set(Math.min(this.pageCount() - 1, Math.max(0, this.page() + delta)));
  }

  /** colour family for the status pill (Sage job statuses: Bid, Refused, Contract, Current, Complete, Closed) */
  tone(status: string | undefined): 'info' | 'warn' | 'ok' | 'bad' | 'none' {
    const s = status?.trim() ?? '';
    if (!s) return 'none';
    if (/refus|hold|lost/i.test(s)) return /refus|lost/i.test(s) ? 'bad' : 'warn';
    if (/bid|pending/i.test(s)) return 'warn';
    if (/complete|done/i.test(s)) return 'ok';
    if (/clos/i.test(s)) return 'none';
    return 'info'; // Current, Contract
  }

  /** percent complete for the progress bar, kept within 0-100 */
  progress(job: CurrentJob): number {
    return Math.min(100, Math.max(0, Math.round(job.percentComplete ?? 0)));
  }
}
