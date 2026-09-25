import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ClientLogService } from './client-log.service';

/**
 * NEW (2026-09-24) - two jobs, both for the API call log (dbo.ApiCallLog):
 *  1. Adds an X-User-Email header (the signed-in user) to every call to the StowellCoAPI, so the API can record WHO made each call.
 *  2. If a call never gets a response at all (status 0: network down, timeout, blocked by the browser), reports it to the log - the
 *     server never saw it, so it can't record it itself. Calls that got an HTTP error response are already logged server-side.
 * The header is only added for our own API (never for Microsoft Graph or anything else).
 */
@Injectable()
export class UserHeaderInterceptor implements HttpInterceptor {
  private injector = inject(Injector);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.startsWith(environment.apiBaseUrl) || req.url.includes('/api/ClientLog/')) {
      return next.handle(req);
    }

    let email: string | null = null;
    try {
      email = this.injector.get(AuthService).getLoggedInUserEmail();
    } catch {
      /* not signed in yet */
    }

    const outgoing = email ? req.clone({ setHeaders: { 'X-User-Email': email } }) : req;
    return next.handle(outgoing).pipe(
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 0) {
          this.injector.get(ClientLogService).log({
            url: req.urlWithParams,
            method: req.method,
            statusCode: 0,
            errorType: 'NoResponse',
            message: 'The API call got no response (network error, timeout or blocked).',
            details: err.message,
          });
        }
        return throwError(() => err);
      })
    );
  }
}
