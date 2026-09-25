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
 * NEW (2026-09-24) - reports errors the API can't see on its own (a JavaScript error in the page, or an API call that never got a
 * response - network down, timeout, blocked) to POST api/ClientLog/Error, which stores them in dbo.ApiCallLog (Source = 'Client')
 * next to the server's own record of every API call. Failed calls that DID reach the API are already logged server-side, so they
 * are not reported again from here.
 *
 * Uses HttpBackend directly so this request bypasses every interceptor (no auth token, and no risk of an error-reporting loop),
 * never throws, and is capped at 30 reports a minute so a broken page can't flood the log.
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
        /* auth not ready - log without a name */
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
