import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ClientLogService } from './client-log.service';

/**
 * Catches uncaught errors anywhere in the app, such as a JavaScript error while a page renders or
 * handles a click, and sends them to the API's error log with the user and the page (2026-09-24).
 * The error still goes to the console as usual. HTTP errors are skipped because the API already
 * logged them.
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
