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
} from '../models/project-management/po-request.model';
import { PoDraftSummary, PoDraftDetail } from '../models/project-management/po-draft.model';

// FIX (2026-09-24): the API's error body is camelCase ({ message, details }) - read both spellings
// so the real reason shows instead of the generic HTTP text (see co-budget-allocation.service.ts).
function backendErrorMessage(err: HttpErrorResponse): string {
  const e = err.error;
  return e?.details || e?.Details || e?.message || e?.Message || err.message || 'Request failed.';
}

/**
 * NEW service - Stowell PO Module (not a Blazor port; built from the "Stowell PO Module" Moqups
 * design spec, page FORM-PO Request).
 *
 * Backend endpoints now implemented: PoQueueController.SavePoRequest (writes a SAGESBQ-only
 * draft, safe/reversible) and .SubmitPoRequest (creates a real, permanent, numbered PO in
 * StowellSandbox.dbo.pchord/pcorln). See po_module_write_side.sql for the write design.
 */
@Injectable({ providedIn: 'root' })
export class PoRequestService {
  private http = inject(HttpClient);
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

  /** NEW - see project-management-endpoints.ts's GetPoByIdUrl header comment: backend not confirmed. */
  getPoById(poId: string): Observable<PoDetail | null> {
    return this.http
      .get<PoDetail>(`${this.base}${ProjectManagementEndpoints.GetPoByIdUrl}/${poId}`)
      .pipe(catchError(() => of(null)));
  }

  /** NEW - see project-management-endpoints.ts's UpdatePoUrl header comment: backend not confirmed. */
  updatePo(poId: string, payload: PoRequestSubmission): Observable<PoUpdateResult> {
    return this.http
      .put<PoUpdateResult>(`${this.base}${ProjectManagementEndpoints.UpdatePoUrl}/${poId}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ saved: false, error: backendErrorMessage(err) })));
  }

  // NEW - mockup update, page FORM-PO Request Approval. See project-management-endpoints.ts's
  // "not backend-implemented yet" note for these 3 methods.
  getForApproval(poId: string): Observable<PoApprovalDetail | null> {
    return this.http
      .get<PoApprovalDetail>(`${this.base}${ProjectManagementEndpoints.GetPoRequestForApprovalUrl}/${poId}`)
      .pipe(catchError(() => of(null)));
  }

  approveRequest(poId: string): Observable<PoApprovalActionResult> {
    return this.http
      .post<PoApprovalActionResult>(`${this.base}${ProjectManagementEndpoints.ApprovePoRequestUrl}`, { poId })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }

  rejectRequest(poId: string, reason: string): Observable<PoApprovalActionResult> {
    return this.http
      .post<PoApprovalActionResult>(`${this.base}${ProjectManagementEndpoints.RejectPoRequestUrl}`, { poId, reason })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }
}
