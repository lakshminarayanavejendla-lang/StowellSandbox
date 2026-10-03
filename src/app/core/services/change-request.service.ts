import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** A PM's change to something already in Sage, waiting for Accounting (see db/change-requests-2026-10-04.sql). */
export interface ChangeRequest {
  id: number;
  /** 'PO', 'CO' or 'COALLOC' (a CO budget allocation). */
  entity: string;
  entityId: string;
  jobId: string | null;
  jobName: string | null;
  /** 'Edit', 'Complete' or 'Delete'. */
  changeType: string;
  summary: string | null;
  /** The new values the PM entered, as JSON (null for a delete). */
  payloadJson: string | null;
  /** How the record looked in Sage when the change was requested, as JSON. */
  beforeJson: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedBy: string;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  rejectReason: string | null;
  applyError: string | null;
}

export interface ChangeDecisionResult {
  succeeded: boolean;
  error?: string;
}

function backendErrorMessage(err: HttpErrorResponse): string {
  const e = err.error;
  return e?.details || e?.Details || e?.message || e?.Message || err.message || 'Request failed.';
}

/**
 * Change requests for records already in Sage: Accounting lists them, then approves (Sage changes now) or rejects
 * (Sage is never touched) each one. Backed by ChangeRequestsController.
 */
@Injectable({ providedIn: 'root' })
export class ChangeRequestService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = environment.apiBaseUrl;

  /**
   * Change requests with the given status (Pending by default), optionally for one record. Emits null when the list
   * could not be loaded, so a failure is never shown as "nothing is waiting".
   */
  getList(status: string = 'Pending', entity?: string, entityId?: string): Observable<ChangeRequest[] | null> {
    const params: Record<string, string> = { status };
    if (entity) params['entity'] = entity;
    if (entityId) params['entityId'] = entityId;
    return this.http.get<ChangeRequest[]>(`${this.base}api/ChangeRequests`, { params }).pipe(catchError(() => of(null)));
  }

  approve(id: number): Observable<ChangeDecisionResult> {
    return this.http
      .post<ChangeDecisionResult>(`${this.base}api/ChangeRequests/Approve`, { id, decidedBy: this.auth.getLoggedInUserEmail() })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }

  reject(id: number, reason: string): Observable<ChangeDecisionResult> {
    return this.http
      .post<ChangeDecisionResult>(`${this.base}api/ChangeRequests/Reject`, { id, decidedBy: this.auth.getLoggedInUserEmail(), reason })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }
}
