import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import {
  CoBudgetAllocationDetail,
  CoBudgetAllocationSubmission,
  CoBudgetAllocationSaveResult,
  CoBudgetAllocationSubmitResult,
} from '../models/project-management/co-budget-allocation.model';

// FIX (2026-09-24, Mike Smith - "Submit failed: Http failure response ... 500"): the API's error body
// is camelCase ({ message, details }), but this only looked for PascalCase (Details/Message), so the
// real reason (e.g. "Cannot deduct from a cost code that has no budget line on this job/phase.") was
// never shown - only the generic HTTP text. Read both spellings.
function backendErrorMessage(err: HttpErrorResponse): string {
  const e = err.error;
  return e?.details || e?.Details || e?.message || e?.Message || err.message || 'Request failed.';
}

/**
 * Stowell PO/CO Module mockup update, page FORM-CO Reallocation (Change Order Budget
 * Allocation). Backed by CoBudgetAllocationController - Save/Submit/GetById write to and read
 * from the app-owned dbo.CoBudgetAllocations/-Phases/-Lines tables (SAGESBQ), not StowellSandbox's
 * real prmchg/bdglin - this deliberately does not post against real Sage budget/CO records yet.
 * Cost codes for the Budget Update grid reuse JobCostCodeService (PO_GetJobCostCodes) rather than
 * a dedicated endpoint here.
 */
@Injectable({ providedIn: 'root' })
export class CoBudgetAllocationService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /** NEW - live preview of the CO Number Submit would auto-assign for the given CO Type (Prime =
   * "BC"+year+seq, Internal = "CO"+year+seq). Not a reservation - see project-management-
   * endpoints.ts's GetNextCoBudgetAllocationNumberUrl comment. */
  getNextNumber(coType: string): Observable<string | null> {
    return this.http
      .get<{ coNumber: string }>(`${this.base}${ProjectManagementEndpoints.GetNextCoBudgetAllocationNumberUrl}?coType=${encodeURIComponent(coType)}`)
      .pipe(
        map((res) => res.coNumber ?? null),
        catchError(() => of(null))
      );
  }

  /** NEW (2026-09-20) - CO Reason / CO Status dropdown options from StowellSandbox (statuses =
   * chgtyp, reasons = distinct prmchg.reason). Null on failure so the page can fall back to its
   * built-in lists instead of showing empty dropdowns. */
  getLookups(): Observable<{ reasons: string[]; statuses: string[] } | null> {
    return this.http
      .get<{ reasons: string[]; statuses: string[] }>(`${this.base}${ProjectManagementEndpoints.GetCoBudgetAllocationLookupsUrl}`)
      .pipe(catchError(() => of(null)));
  }

  /** NEW (2026-09-20) - the full cost code master list expressed as the given job's own cost codes
   * (not just the codes the job already has a budget line for). */
  getAllCostCodes(jobId: string): Observable<{ costCode: number; costCodeDescription: string }[]> {
    return this.http
      .get<{ costCode: number; costCodeDescription: string }[]>(`${this.base}${ProjectManagementEndpoints.GetCoBudgetAllocationAllCostCodesUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  /** NEW (2026-09-24) - each cost code's current budget per phase for a job (Sage's bdglin), used by the form's pre-submit phase
   * check. Returns null (not []) when it could not be loaded, so the form can skip the check instead of wrongly passing/blocking. */
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

  /** NEW (2026-09-20) - deletes an allocation; if it was submitted, the backend also reverses its
   * posting on the real budget lines (see CoBudgetAllocationController.Delete). */
  delete(allocationId: number, deletedBy: string): Observable<{ deleted: boolean; error?: string }> {
    return this.http
      .delete<{ deleted: boolean }>(`${this.base}${ProjectManagementEndpoints.GetCoBudgetAllocationByIdUrl}/${allocationId}?deletedBy=${encodeURIComponent(deletedBy)}`)
      .pipe(catchError((err: HttpErrorResponse) => of({ deleted: false, error: backendErrorMessage(err) })));
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
