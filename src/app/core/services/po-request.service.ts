import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import {
  PoRequestSubmission,
  PoSaveResult,
  PoSubmitResult,
  PoDetail,
  PoUpdateResult,
  PoApprovalDetail,
  PoApprovalActionResult,
  PendingPoApproval,
} from '../models/project-management/po-request.model';
import { AuthService } from './auth.service';
import { PoDraftSummary, PoDraftDetail } from '../models/project-management/po-draft.model';

// The API's error body may be { message, details } or PascalCase. Read both so the real reason
// shows (2026-09-24; see co-budget-allocation.service.ts).
function backendErrorMessage(err: HttpErrorResponse): string {
  const e = err.error;
  return e?.details || e?.Details || e?.message || e?.Message || err.message || 'Request failed.';
}

/**
 * Purchase order requests, built from the Moqups design (page FORM-PO Request), not ported from
 * Blazor.
 *
 * SavePoRequest saves a draft in SAGESBQ, which is safe to undo. SubmitPoRequest creates a real,
 * permanent, numbered PO in StowellSandbox (pchord and pcorln). See po_module_write_side.sql.
 */
@Injectable({ providedIn: 'root' })
export class PoRequestService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = environment.apiBaseUrl;

  savePo(payload: PoRequestSubmission): Observable<PoSaveResult> {
    return this.http
      .post<PoSaveResult>(`${this.base}${ProjectManagementEndpoints.SavePoRequestUrl}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ saved: false, error: backendErrorMessage(err) })));
  }

  submitPoRequest(payload: PoRequestSubmission): Observable<PoSubmitResult> {
    return this.http
      .post<PoSubmitResult>(`${this.base}${ProjectManagementEndpoints.SubmitPoRequestUrl}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ submitted: false, error: backendErrorMessage(err) })));
  }

  getDrafts(): Observable<PoDraftSummary[]> {
    return this.http
      .get<PoDraftSummary[]>(`${this.base}${ProjectManagementEndpoints.GetPoDraftsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getDraft(draftId: number): Observable<PoDraftDetail | null> {
    return this.http
      .get<PoDraftDetail>(`${this.base}${ProjectManagementEndpoints.GetPoDraftUrl}/${draftId}`)
      .pipe(catchError(() => of(null)));
  }

  deleteDraft(draftId: number): Observable<boolean> {
    return this.http
      .delete<{ deleted: boolean }>(`${this.base}${ProjectManagementEndpoints.DeletePoDraftUrl}/${draftId}`)
      .pipe(
        map((res) => res.deleted),
        catchError(() => of(false))
      );
  }

  /** Loads a submitted PO for editing (PoQueueController.GetPoById). */
  getPoById(poId: string): Observable<PoDetail | null> {
    return this.http
      .get<PoDetail>(`${this.base}${ProjectManagementEndpoints.GetPoByIdUrl}/${poId}`)
      .pipe(catchError(() => of(null)));
  }

  /** Saves changes to a submitted PO (PoQueueController.UpdatePo). */
  updatePo(poId: string, payload: PoRequestSubmission): Observable<PoUpdateResult> {
    return this.http
      .put<PoUpdateResult>(`${this.base}${ProjectManagementEndpoints.UpdatePoUrl}/${poId}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ saved: false, error: backendErrorMessage(err) })));
  }

  // PO approval (Moqups page FORM-PO Request Approval), in PoQueueController.
  getForApproval(poId: string): Observable<PoApprovalDetail | null> {
    return this.http
      .get<PoApprovalDetail>(`${this.base}${ProjectManagementEndpoints.GetPoRequestForApprovalUrl}/${poId}`)
      .pipe(catchError(() => of(null)));
  }

  approveRequest(poId: string): Observable<PoApprovalActionResult> {
    return this.http
      .post<PoApprovalActionResult>(`${this.base}${ProjectManagementEndpoints.ApprovePoRequestUrl}`, { poId, decidedBy: this.auth.getLoggedInUserEmail() })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }

  rejectRequest(poId: string, reason: string): Observable<PoApprovalActionResult> {
    return this.http
      .post<PoApprovalActionResult>(`${this.base}${ProjectManagementEndpoints.RejectPoRequestUrl}`, { poId, reason, decidedBy: this.auth.getLoggedInUserEmail() })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }

  /** POs waiting for Accounting approval (Accounting > PO Queue). */
  getPendingApprovals(): Observable<PendingPoApproval[]> {
    return this.http
      .get<PendingPoApproval[]>(`${this.base}api/PoQueue/GetPendingPoApprovals`)
      .pipe(catchError(() => of([])));
  }
}
