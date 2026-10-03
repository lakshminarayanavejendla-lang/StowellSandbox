import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiLogDetail, ApiLogFilter, ApiLogPage, ApiLogRow, ApiLogService, ApiLogSummary } from '../../../core/services/api-log.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// Stowell Admin > "API Success & Errors" (2026-09-24). Every API call from every user (dbo.ApiCallLog):
// the user, time, status and duration. Failures show their reason, and opening a row shows the stack
// trace or error response. Filtering and paging run in SQL, so it stays fast on a big log.
type Preset = '1h' | '24h' | '7d' | '30d' | 'custom';

@Component({
  selector: 'app-api-log',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule],
  templateUrl: './api-log.component.html',
  styleUrl: './api-log.component.scss',
})
export class ApiLogComponent implements OnInit, OnDestroy {
  private api = inject(ApiLogService);
  private cdr = inject(ChangeDetectorRef);

  preset: Preset = '24h';
  from = '';
  to = '';
  result: 'all' | 'success' | 'error' = 'all';
  user = '';
  q = '';
  source: '' | 'API' | 'Client' = '';
  page = 1;
  pageSize = 50;

  summary: ApiLogSummary | null = null;
  data: ApiLogPage | null = null;
  loading = false;
  loadFailed = false;
  lastLoaded: Date | null = null;

  autoRefresh = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  selected: ApiLogRow | null = null;
  detail: ApiLogDetail | null = null;
  detailLoading = false;

  ngOnInit(): void {
    this.applyPreset('24h');
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  // --- filters ---------------------------------------------------------------------------------------------------------

  applyPreset(p: Preset): void {
    this.preset = p;
    if (p !== 'custom') {
      const end = new Date();
      const hours = p === '1h' ? 1 : p === '24h' ? 24 : p === '7d' ? 24 * 7 : 24 * 30;
      this.to = this.toLocalInput(new Date(end.getTime() + 60_000));
      this.from = this.toLocalInput(new Date(end.getTime() - hours * 3_600_000));
    }
    this.page = 1;
    this.reload();
  }

  onFilterChanged(): void {
    this.page = 1;
    this.reload();
  }

  setResult(r: 'all' | 'success' | 'error'): void {
    this.result = r;
    this.onFilterChanged();
  }

  pickUser(name: string | null): void {
    this.user = name ?? '';
    this.onFilterChanged();
  }

  pickPath(path: string | null): void {
    this.q = path ?? '';
    this.result = 'error';
    this.onFilterChanged();
  }

  clearFilters(): void {
    this.result = 'all';
    this.user = '';
    this.q = '';
    this.source = '';
    this.applyPreset('24h');
  }

  toggleAutoRefresh(): void {
    this.stopTimer();
    if (this.autoRefresh) {
      this.timer = setInterval(() => {
        // Windows like "last hour" or "24h" move forward with the clock while auto-refresh is on.
        if (this.preset !== 'custom') this.slideWindow();
        this.reload(true);
      }, 15_000);
    }
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private slideWindow(): void {
    const hours = this.preset === '1h' ? 1 : this.preset === '24h' ? 24 : this.preset === '7d' ? 24 * 7 : 24 * 30;
    const end = new Date();
    this.to = this.toLocalInput(new Date(end.getTime() + 60_000));
    this.from = this.toLocalInput(new Date(end.getTime() - hours * 3_600_000));
  }

  // --- loading ---------------------------------------------------------------------------------------------------------

  private filter(): ApiLogFilter {
    return {
      from: this.withSeconds(this.from),
      to: this.withSeconds(this.to),
      result: this.result,
      user: this.user,
      q: this.q,
      source: this.source,
      page: this.page,
      pageSize: this.pageSize,
    };
  }

  reload(quiet = false): void {
    if (!quiet) this.loading = true;
    this.loadFailed = false;
    const f = this.filter();

    this.api.summary(f).subscribe((s) => {
      this.summary = s;
      this.cdr.detectChanges();
    });
    this.api.search(f).subscribe({
      next: (d) => {
        this.loading = false;
        this.data = d;
        this.lastLoaded = new Date();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.loadFailed = true;
        this.loadError = this.api.describeError(err);
        this.cdr.detectChanges();
      },
    });
  }

  loadError = '';

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.reload();
  }

  get totalPages(): number {
    return this.data ? Math.max(1, Math.ceil(this.data.total / this.data.pageSize)) : 1;
  }

  get errorRate(): string {
    if (!this.summary || !this.summary.total) return '0%';
    return ((this.summary.errors / this.summary.total) * 100).toFixed(1) + '%';
  }

  // --- row details -----------------------------------------------------------------------------------------------------

  open(row: ApiLogRow): void {
    if (this.selected?.id === row.id) {
      this.selected = null;
      this.detail = null;
      return;
    }
    this.selected = row;
    this.detail = null;
    this.detailLoading = true;
    this.api.detail(row.id).subscribe((d) => {
      if (this.selected?.id === row.id) {
        this.detail = d;
        this.detailLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  statusClass(row: ApiLogRow): string {
    if (!row.isError) return 'ok';
    const s = row.statusCode ?? 0;
    return s >= 400 && s < 500 ? 'warn' : 'bad';
  }

  // --- helpers ---------------------------------------------------------------------------------------------------------

  private toLocalInput(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  private withSeconds(v: string): string {
    return v && v.length === 16 ? v + ':00' : v;
  }
}
