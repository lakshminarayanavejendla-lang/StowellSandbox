import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import {
  CoBudgetAllocationDetail,
  CoBudgetAllocationSubmission,
  CoBudgetAllocationSaveResult,
  CoBudgetAllocationSubmitResult,
  PendingAllocationApproval,
  AllocationApprovalResult,
} from '../models/project-management/co-budget-allocation.model';

// The API's error body can be { message, details } or { Message, Details }. Read both, so the user
// sees the real reason, for example "Cannot deduct from a cost code that has no budget line on this
// job/phase.", not just the HTTP status (Mike Smith, 2026-09-24).
function backendErrorMessage(err: HttpErrorResponse): string {
  const e = err.error;
  return e?.details || e?.Details || e?.message || e?.Message || err.message || 'Request failed.';
}

/**
 * Change Order Budget Allocation (Moqups page FORM-CO Reallocation), backed by
 * CoBudgetAllocationController. Save, Submit and GetById use the app's own CoBudgetAllocations
 * tables in SAGESBQ; an approved allocation is then posted to the job's Sage budget. The Budget
 * Update grid gets its cost codes from JobCostCodeService.
 */
@Injectable({ providedIn: 'root' })
export class CoBudgetAllocationService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /** The CO number Submit would give this CO type: "BC" + year + sequence for Prime, "CO" + year +
   * sequence for Internal. It's only a preview and doesn't reserve the number. */
  getNextNumber(coType: string): Observable<string | null> {
    return this.http
      .get<{ coNumber: string }>(`${this.base}${ProjectManagementEndpoints.GetNextCoBudgetAllocationNumberUrl}?coType=${encodeURIComponent(coType)}`)
      .pipe(
        map((res) => res.coNumber ?? null),
        catchError(() => of(null))
      );
  }

  /** CO Reason and CO Status options from StowellSandbox (statuses from chgtyp, reasons from
   * prmchg.reason). Returns null if it fails, so the page falls back to its built-in lists. */
  getLookups(): Observable<{ reasons: string[]; statuses: string[] } | null> {
    return this.http
      .get<{ reasons: string[]; statuses: string[] }>(`${this.base}${ProjectManagementEndpoints.GetCoBudgetAllocationLookupsUrl}`)
      .pipe(catchError(() => of(null)));
  }

  /** Every cost code, written as this job's cost codes, including ones the job has no budget line for yet. */
  getAllCostCodes(jobId: string): Observable<{ costCode: number; costCodeDescription: string }[]> {
    return this.http
      .get<{ costCode: number; costCodeDescription: string }[]>(`${this.base}${ProjectManagementEndpoints.GetCoBudgetAllocationAllCostCodesUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  /** Each cost code's budget per phase for a job (Sage's bdglin), for the form's check before Submit.
   * Returns null, not [], if loading fails, so the form skips the check instead of getting it wrong. */
  getPhaseBudgets(jobId: string): Observable<{ costCode: number; phase: number; budget: number }[] | null> {
    return this.http
      .get<{ costCode: number; phase: number; budget: number }[]>(`${this.base}${ProjectManagementEndpoints.GetCoBudgetAllocationPhaseBudgetsUrl}/${jobId}`)
      .pipe(catchError(() => of(null)));
  }

  getById(allocationId: number): Observable<CoBudgetAllocationDetail | null> {
    return this.http
      .get<CoBudgetAllocationDetail>(`${this.base}${ProjectManagementEndpoints.GetCoBudgetAllocationByIdUrl}/${allocationId}`)
      .pipe(catchError(() => of(null)));
  }

  /** Deletes an allocation. If it was submitted, the server also reverses what it posted to the budget lines. */
  delete(allocationId: number, deletedBy: string): Observable<{ deleted: boolean; pendingApproval?: boolean; requestId?: number; error?: string }> {
    return this.http
      .delete<{ deleted: boolean; pendingApproval?: boolean; requestId?: number }>(`${this.base}${ProjectManagementEndpoints.GetCoBudgetAllocationByIdUrl}/${allocationId}?deletedBy=${encodeURIComponent(deletedBy)}`)
      .pipe(catchError((err: HttpErrorResponse) => of({ deleted: false, error: backendErrorMessage(err) })));
  }

  // ---- Accounting approval (Mike Smith, 2026-09-26; see db/allocation-approval-2026-09-26.sql) ----

  private auth = inject(AuthService);

  /** Allocations (Prime and Internal) waiting for Accounting approval. */
  getPendingApprovals(): Observable<PendingAllocationApproval[]> {
    return this.http
      .get<PendingAllocationApproval[]>(`${this.base}api/CoBudgetAllocation/ApprovalRequests/Pending`)
      .pipe(catchError(() => of([])));
  }

  /** One waiting request, in the same shape as getById so the allocation page can show it unchanged. */
  getApprovalRequest(requestId: number): Observable<CoBudgetAllocationDetail | null> {
    return this.http
      .get<CoBudgetAllocationDetail>(`${this.base}api/CoBudgetAllocation/ApprovalRequests/${requestId}`)
      .pipe(catchError(() => of(null)));
  }

  /** Approve: the allocation is posted to Sage (the real submit) and the request is marked Approved. */
  approveRequest(requestId: number): Observable<AllocationApprovalResult> {
    return this.http
      .post<AllocationApprovalResult>(`${this.base}api/CoBudgetAllocation/ApprovalRequests/Approve`, { requestId, decidedBy: this.auth.getLoggedInUserEmail() })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }

  /** Reject: the request is marked Rejected (reason required) and leaves the queue. Nothing is posted. */
  rejectRequest(requestId: number, reason: string): Observable<AllocationApprovalResult> {
    return this.http
      .post<AllocationApprovalResult>(`${this.base}api/CoBudgetAllocation/ApprovalRequests/Reject`, { requestId, reason, decidedBy: this.auth.getLoggedInUserEmail() })
      .pipe(catchError((err: HttpErrorResponse) => of({ succeeded: false, error: backendErrorMessage(err) })));
  }

  save(payload: CoBudgetAllocationSubmission): Observable<CoBudgetAllocationSaveResult> {
    return this.http
      .post<CoBudgetAllocationSaveResult>(`${this.base}${ProjectManagementEndpoints.SaveCoBudgetAllocationUrl}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ saved: false, error: backendErrorMessage(err) })));
  }

  submit(payload: CoBudgetAllocationSubmission): Observable<CoBudgetAllocationSubmitResult> {
    return this.http
      .post<CoBudgetAllocationSubmitResult>(`${this.base}${ProjectManagementEndpoints.SubmitCoBudgetAllocationUrl}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => of({ submitted: false, error: backendErrorMessage(err) })));
  }
}
