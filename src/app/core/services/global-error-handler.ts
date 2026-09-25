import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ClientLogService } from './client-log.service';

/**
 * NEW (2026-09-24) - catches uncaught errors anywhere in the app (a JavaScript error while a page renders or handles a click) and
 * reports them to the API's call/error log with the signed-in user and the page. Behaves exactly like Angular's default handler
 * otherwise (the error still goes to the browser console). HTTP error responses are skipped here - the API already logged those.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private clientLog = inject(ClientLogService);

  handleError(error: unknown): void {
    console.error(error);

    const err: any = (error as any)?.rejection ?? error;      // unhandled promise rejections arrive wrapped
    if (err instanceof HttpErrorResponse && err.status !== 0) return;

    this.clientLog.log({
      errorType: err?.name ?? 'Error',
      message: err?.message ?? String(err),
      details: err?.stack,
    });
  }
}
