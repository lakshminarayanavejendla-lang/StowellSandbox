import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import {
  CoRequestSubmission,
  CoSaveResult,
  CoSubmitResult,
  CoDetail,
  CoUpdateResult,
  CoApprovalDetail,
  CoApprovalActionResult,
  PendingCoApproval,
} from '../models/project-management/co-request.model';
import { CoDraftSummary, CoDraftDetail } from '../models/project-management/po-draft.model';
import { AuthService } from './auth.service';

// The API's error body may be { message, details } or PascalCase. Read both so the real reason
// shows (2026-09-24; see co-budget-allocation.service.ts).
function backendErrorMessage(err: HttpErrorResponse): string {
  const e = err.error;
  return e?.details || e?.Details || e?.message || e?.Message || err.message || 'Request failed.';
}

/**
 * Change order requests, built from the Moqups design (page FORM-CO Request), not ported from
 * Blazor. Works like po-request.service.ts.
 *
 * SaveCoRequest saves a draft in SAGESBQ, which is safe to undo. SubmitCoRequest creates a real,
 * permanent, numbered CO in StowellSandbox (prmchg and sbcgln). See po_module_write_side.sql.
 */
@Injectable({ providedIn: 'root' })
export class CoRequestService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = environment.apiBaseUrl;

  saveCo(payload: CoRequestSubmission): Observable<CoSaveResult> {
    return this.http
      .post<CoSaveResult>(`${this.base}${ProjectManagementEndpoints.SaveCoRequestUrl}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ saved: false, error: backendErrorMessage(err) })));
  }

  submitCoRequest(payload: CoRequestSubmission): Observable<CoSubmitResult> {
    return this.http
      .post<CoSubmitResult>(`${this.base}${ProjectManagementEndpoints.SubmitCoRequestUrl}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ submitted: false, error: backendErrorMessage(err) })));
  }

  getDrafts(): Observable<CoDraftSummary[]> {
    return this.http
      .get<CoDraftSummary[]>(`${this.base}${ProjectManagementEndpoints.GetCoDraftsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getDraft(draftId: number): Observable<CoDraftDetail | null> {
    return this.http
      .get<CoDraftDetail>(`${this.base}${ProjectManagementEndpoints.GetCoDraftUrl}/${draftId}`)
      .pipe(catchError(() => of(null)));
  }

  deleteDraft(draftId: number): Observable<boolean> {
    return this.http
      .delete<{ deleted: boolean }>(`${this.base}${ProjectManagementEndpoints.DeleteCoDraftUrl}/${draftId}`)
      .pipe(
        map((res) => res.deleted),
        catchError(() => of(false))
      );
  }

  /**
   * Some old CO numbers contain a slash, such as '10064-46/60'. Without encodeURIComponent the server
   * reads the slash as another path segment, returns 404, and the edit form loads nothing.
   */
  getCoById(coId: string): Observable<CoDetail | null> {
    return this.http
      .get<CoDetail>(`${this.base}${ProjectManagementEndpoints.GetCoByIdUrl}/${encodeURIComponent(coId)}`)
      .pipe(catchError(() => of(null)));
  }

  /** Saves changes to a submitted CO (CoQueueController.UpdateCo). */
  updateCo(coId: string, payload: CoRequestSubmission): Observable<CoUpdateResult> {
    return this.http
      .put<CoUpdateResult>(`${this.base}${ProjectManagementEndpoints.UpdateCoUrl}/${encodeURIComponent(coId)}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ saved: false, error: backendErrorMessage(err) })));
  }

  // CO approval (Moqups page FORM-CO Request Approval). Works like the PO approval methods.
  getForApproval(coId: string): Observable<CoApprovalDetail | null> {
    return this.http
      .get<CoApprovalDetail>(`${this.base}${ProjectManagementEndpoints.GetCoRequestForApprovalUrl}/${encodeURIComponent(coId)}`)
      .pipe(catchError(() => of(null)));
  }

  approveRequest(coId: string): Observable<CoApprovalActionResult> {
    return this.http
      .post<CoApprovalActionResult>(`${this.base}${ProjectManagementEndpoints.ApproveCoRequestUrl}`, { coId, decidedBy: this.auth.getLoggedInUserEmail() })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }

  rejectRequest(coId: string, reason: string): Observable<CoApprovalActionResult> {
    return this.http
      .post<CoApprovalActionResult>(`${this.base}${ProjectManagementEndpoints.RejectCoRequestUrl}`, { coId, reason, decidedBy: this.auth.getLoggedInUserEmail() })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }

  /** COs waiting for Accounting approval (Accounting > CO Queue). */
  getPendingApprovals(): Observable<PendingCoApproval[]> {
    return this.http
      .get<PendingCoApproval[]>(`${this.base}api/CoQueue/GetPendingCoApprovals`)
      .pipe(catchError(() => of([])));
  }
}
