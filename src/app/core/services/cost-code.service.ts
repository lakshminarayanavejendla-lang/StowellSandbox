import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountingEndpoints } from '../accounting-endpoints';
import { CostCodeRecord, Phase, PhaseListResponse } from '../models/accounting/budget.model';
import { AuthService } from './auth.service';

/**
 * Partial port of ICostCodeService/CostCodeService.cs - only the three methods the
 * Accounting module's pages actually call (GetAllUserJobs for the budget-approval job
 * dropdown, GetJobPhasesData for that dropdown's phase list, GetAllPhases for AddForm's
 * "Additional Phases" popup). The full C# interface has ~15 more methods
 * (GetCurrentCostSummaryViewModel, CashFlowAllDataByPeriod, GetContractSummaryData,
 * GetPrimeChangeList, GetInvoiceReceivable/GetARInvoice, the *ForReport family, etc.) that
 * belong to cost-code-summary/cash-flow reporting pages outside this module - likely
 * Project Management's or Reporting's territory; port those alongside whichever page
 * actually uses them rather than here, to avoid a speculative, untested surface.
 */
@Injectable({ providedIn: 'root' })
export class CostCodeService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
private authService = inject(AuthService);
  getAllUserJobs(): Observable<CostCodeRecord[]> {
    return this.http
      .get<CostCodeRecord[]>(`${this.base}${AccountingEndpoints.GetAllUserJobsUrl}/${this.authService.getLoggedInUserEmail()  ?? '' }`)
      .pipe(catchError(() => of([])));
  }

  getJobPhasesData(jobId: number): Observable<Phase[]> {
    return this.http
      .get<Phase[]>(`${this.base}${AccountingEndpoints.GetJobPhasesDataUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  // CostCodeService.cs unwraps an ApiListResponse<Phase> ({ data: [...] }) for this one call
  // specifically - every other CostCode/Accounting GET in the source returns a bare array.
  // Confirm this asymmetry is real (not a source-reading artifact) before trusting it in prod.
  getAllPhases(): Observable<Phase[]> {
    return this.http.get<PhaseListResponse>(`${this.base}${AccountingEndpoints.GetAllPhasesUrl}`).pipe(
      map((res) => res?.data ?? []),
      catchError(() => of([]))
    );
  }
}
