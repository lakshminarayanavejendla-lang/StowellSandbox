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
} from '../models/project-management/co-request.model';
import { CoDraftSummary, CoDraftDetail } from '../models/project-management/po-draft.model';

// FIX (2026-09-24): the API's error body is camelCase ({ message, details }) - read both spellings
// so the real reason shows instead of the generic HTTP text (see co-budget-allocation.service.ts).
function backendErrorMessage(err: HttpErrorResponse): string {
  const e = err.error;
  return e?.details || e?.Details || e?.message || e?.Message || err.message || 'Request failed.';
}

/**
 * NEW service - Stowell PO Module (not a Blazor port; built from the "Stowell PO Module" Moqups
 * design spec, page FORM-CO Request). Mirrors po-request.service.ts.
 *
 * Backend endpoints now implemented: CoQueueController.SaveCoRequest (writes a SAGESBQ-only
 * draft, safe/reversible) and .SubmitCoRequest (creates a real, permanent, numbered CO in
 * StowellSandbox.dbo.prmchg/sbcgln). See po_module_write_side.sql for the write design.
 */
@Injectable({ providedIn: 'root' })
export class CoRequestService {
  private http = inject(HttpClient);
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
   * FIX - edit form loading nothing for CO ids that contain a literal '/' (e.g. '10064-46/60' -
   * some historical chgnum values are formatted this way). RouterLink already encodes that '/'
   * correctly when building the link (confirmed: browser URL shows '10064-46%2F60', and
   * ActivatedRoute decodes it back to the raw id with the slash) - the bug was here instead:
   * concatenating the raw id into this URL string sends the literal '/' straight to the server,
   * where it's read as an extra path segment rather than part of {coId}, so the real endpoint
   * 404s and this silently resolves to null. encodeURIComponent keeps it one segment on the wire.
   */
  getCoById(coId: string): Observable<CoDetail | null> {
    return this.http
      .get<CoDetail>(`${this.base}${ProjectManagementEndpoints.GetCoByIdUrl}/${encodeURIComponent(coId)}`)
      .pipe(catchError(() => of(null)));
  }

  /** NEW - see project-management-endpoints.ts's UpdateCoUrl header comment: backend not confirmed. */
  updateCo(coId: string, payload: CoRequestSubmission): Observable<CoUpdateResult> {
    return this.http
      .put<CoUpdateResult>(`${this.base}${ProjectManagementEndpoints.UpdateCoUrl}/${encodeURIComponent(coId)}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ saved: false, error: backendErrorMessage(err) })));
  }

  // NEW - mockup update, page FORM-CO Request Approval. Mirrors po-request.service.ts's
  // approval methods.
  getForApproval(coId: string): Observable<CoApprovalDetail | null> {
    return this.http
      .get<CoApprovalDetail>(`${this.base}${ProjectManagementEndpoints.GetCoRequestForApprovalUrl}/${encodeURIComponent(coId)}`)
      .pipe(catchError(() => of(null)));
  }

  approveRequest(coId: string): Observable<CoApprovalActionResult> {
    return this.http
      .post<CoApprovalActionResult>(`${this.base}${ProjectManagementEndpoints.ApproveCoRequestUrl}`, { coId })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }

  rejectRequest(coId: string, reason: string): Observable<CoApprovalActionResult> {
    return this.http
      .post<CoApprovalActionResult>(`${this.base}${ProjectManagementEndpoints.RejectCoRequestUrl}`, { coId, reason })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }
}
