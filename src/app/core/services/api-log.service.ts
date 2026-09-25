import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

// NEW (2026-09-24) - backs the "API Success & Errors" page under Stowell Admin. Reads dbo.ApiCallLog through
// StowellCoAPI's ApiLogController (Summary / Search / Detail). See db\api-call-log-2026-09-24.sql.

export interface ApiLogSummary {
  total: number;
  success: number;
  errors: number;
  avgMs: number;
  topErrors: { path: string | null; count: number; lastAt: string }[];
  users: { userName: string | null; calls: number; errors: number }[];
}

export interface ApiLogRow {
  id: number;
  loggedAt: string;
  userName: string | null;
  source: string | null;
  method: string | null;
  path: string | null;
  query: string | null;
  statusCode: number | null;
  durationMs: number | null;
  isError: boolean;
  errorType: string | null;
  errorMessage: string | null;
}

export interface ApiLogPage {
  total: number;
  page: number;
  pageSize: number;
  rows: ApiLogRow[];
}

export interface ApiLogDetail {
  details: string | null;
  clientIp: string | null;
  userAgent: string | null;
  traceId: string | null;
}

export interface ApiLogFilter {
  from: string;          // local date-time, e.g. 2026-09-24T00:00:00
  to: string;
  result: 'all' | 'success' | 'error';
  user: string;
  q: string;
  source: '' | 'API' | 'Client';
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class ApiLogService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  private params(f: ApiLogFilter, paged: boolean): HttpParams {
    let p = new HttpParams().set('from', f.from).set('to', f.to);
    if (f.source) p = p.set('source', f.source);
    if (paged) {
      p = p.set('result', f.result).set('page', f.page).set('pageSize', f.pageSize);
      if (f.user.trim()) p = p.set('user', f.user.trim());
      if (f.q.trim()) p = p.set('q', f.q.trim());
    }
    return p;
  }

  summary(f: ApiLogFilter): Observable<ApiLogSummary | null> {
    return this.http
      .get<ApiLogSummary>(`${this.base}api/ApiLog/Summary`, { params: this.params(f, false) })
      .pipe(catchError(() => of(null)));
  }

  // Errors are NOT swallowed here (unlike summary/detail) so the page can say what actually went wrong - see describeError().
  search(f: ApiLogFilter): Observable<ApiLogPage> {
    return this.http.get<ApiLogPage>(`${this.base}api/ApiLog/Search`, { params: this.params(f, true) });
  }

  /** Plain-language reason a call to the log endpoints failed (404 = API not updated, 500 = usually the table is missing, 0 = unreachable). */
  describeError(err: any): string {
    const status = err?.status;
    const body = err?.error;
    const reason: string = body?.details || body?.Details || body?.message || body?.Message || '';
    if (status === 0) return 'The API cannot be reached (network, or the API is down).';
    if (status === 404) return 'The API does not have the log endpoints yet (HTTP 404) - deploy the newest API (api-publish).';
    if (/Invalid object name.*ApiCallLog/i.test(reason)) return 'The ApiCallLog table is not on this database - run section 10 of the SQL file (api-call-log-2026-09-24.sql).';
    return `The API returned an error${status ? ' (HTTP ' + status + ')' : ''}${reason ? ': ' + reason : '.'}`;
  }

  detail(id: number): Observable<ApiLogDetail | null> {
    return this.http.get<ApiLogDetail>(`${this.base}api/ApiLog/Detail/${id}`).pipe(catchError(() => of(null)));
  }
}
