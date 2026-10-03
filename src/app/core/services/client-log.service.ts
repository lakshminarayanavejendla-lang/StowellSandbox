import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ClientErrorReport {
  url?: string;
  method?: string;
  statusCode?: number | null;
  errorType?: string;
  message?: string;
  details?: string;
}

/**
 * Sends errors the API can't see to POST api/ClientLog/Error (2026-09-24): JavaScript errors in the
 * page, and API calls that never got a response because the network was down, they timed out or
 * were blocked. They're stored in dbo.ApiCallLog with Source = 'Client', next to the server's own
 * log. Calls that reached the API are already logged there, so they aren't sent again.
 *
 * It uses HttpBackend, so the request skips all interceptors (no token, and no error-reporting
 * loop). It never throws, and it sends at most 30 reports a minute so a broken page can't flood
 * the log.
 */
@Injectable({ providedIn: 'root' })
export class ClientLogService {
  private http = new HttpClient(inject(HttpBackend));
  private injector = inject(Injector);
  private windowStart = Date.now();
  private sentInWindow = 0;

  log(report: ClientErrorReport): void {
    try {
      const now = Date.now();
      if (now - this.windowStart > 60_000) {
        this.windowStart = now;
        this.sentInWindow = 0;
      }
      if (++this.sentInWindow > 30) return;

      let userName: string | null = null;
      try {
        userName = this.injector.get(AuthService).getLoggedInUserEmail();
      } catch {
        /* sign-in not ready, so log without a name */
      }

      this.http
        .post(`${environment.apiBaseUrl}api/ClientLog/Error`, {
          userName,
          url: report.url ?? window.location.href,
          method: report.method,
          statusCode: report.statusCode ?? null,
          errorType: report.errorType,
          message: report.message,
          details: report.details,
        })
        .subscribe({ error: () => {} });
    } catch {
      /* reporting must never throw */
    }
  }
}
