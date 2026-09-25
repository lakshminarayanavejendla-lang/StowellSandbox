import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { ProjectBudgetQueueItem, BudgetRecord } from '../models/project-management/project-budget.model';
import { Phase } from '../models/project-management/cost-summary.model';

// Port of Services/IProjectBudget.cs + ProjectBudget.cs - backs Project Budget Configuration
// (the queue) and Create/Modify Budget.
@Injectable({ providedIn: 'root' })
export class ProjectBudgetService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getProjectBudgetRecords(email: string): Observable<ProjectBudgetQueueItem[]> {
    debugger;
    return this.http
      .get<ProjectBudgetQueueItem[]>(`${this.base}${ProjectManagementEndpoints.GetProjectBudgetRecordsUrl}/${encodeURIComponent(email)}`)
      .pipe(catchError(() => of([])));
  }

  /**
   * NOTE: the C# service posts the selected Phase to this SAME URL as
   * getProjectBudgetRecords() above (GET for the queue list, POST for a single phase's budget
   * rows) - an odd dual-purpose endpoint, ported as-is rather than guessed into two different
   * routes. Confirm with the backend whether that's intentional.
   */
  budgetData(phase: Phase): Observable<BudgetRecord[]> {
    return this.http
      .post<BudgetRecord[]>(`${this.base}${ProjectManagementEndpoints.GetProjectBudgetRecordsUrl}`, phase)
      .pipe(catchError(() => of([])));
  }

  /**
   * The C# version stamps each record.Email from the authenticated user's claims before
   * posting - same MSAL-vs-server-claims gap flagged elsewhere in this phase (see
   * CostCodeService.getAllUserJobs). TODO: confirm how/whether the API still needs an email on
   * each record once bearer-token auth carries the identity instead.
   */
  saveCreateBatchCostCodes(records: BudgetRecord[]): Observable<BudgetRecord[]> {
    return this.http
      .post<BudgetRecord[]>(`${this.base}${ProjectManagementEndpoints.SaveCreateBatchCostCodesUrl}`, records)
      .pipe(catchError(() => of([])));
  }

  submitBatchCostCodes(records: BudgetRecord[]): Observable<BudgetRecord[]> {
    return this.http
      .post<BudgetRecord[]>(`${this.base}${ProjectManagementEndpoints.SubmitBatchCostCodesUrl}`, records)
      .pipe(catchError(() => of([])));
  }

  getCostCodesAsync(filter: string): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.base}${ProjectManagementEndpoints.GetCostCodesAsyncUrl}/${filter}`)
      .pipe(catchError(() => of([])));
  }

  /** Port of ProjectBudget.cs' UploadAddExcelAsync(List&lt;BudgetRecord&gt;) overload (the one
   * CreateBudgetBase.ProcessExcel actually calls after parsing the workbook client-side via
   * NPOI - the app parses the .xlsx in C#, not the raw file, before this call). */
  uploadParsedBudgetRows(records: BudgetRecord[]): Observable<BudgetRecord[]> {
    return this.http
      .post<BudgetRecord[]>(`${this.base}${ProjectManagementEndpoints.UploadAddExcelUrl}`, records)
      .pipe(catchError(() => of([])));
  }
}
