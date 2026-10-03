import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { ProjectBudgetQueueItem, BudgetRecord } from '../models/project-management/project-budget.model';
import { Phase } from '../models/project-management/cost-summary.model';

// Ported from ProjectBudget.cs, for the Project Budget Configuration queue and Create/Modify Budget.
@Injectable({ providedIn: 'root' })
export class ProjectBudgetService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getProjectBudgetRecords(email: string): Observable<ProjectBudgetQueueItem[]> {
    return this.http
      .get<ProjectBudgetQueueItem[]>(`${this.base}${ProjectManagementEndpoints.GetProjectBudgetRecordsUrl}/${encodeURIComponent(email)}`)
      .pipe(catchError(() => of([])));
  }

  /**
   * This posts the phase to the same URL getProjectBudgetRecords() uses: GET returns the queue and
   * POST returns one phase's budget rows. Odd, but kept as in C#. Check with the backend whether
   * that's on purpose.
   */
  budgetData(phase: Phase): Observable<BudgetRecord[]> {
    return this.http
      .post<BudgetRecord[]>(`${this.base}${ProjectManagementEndpoints.GetProjectBudgetRecordsUrl}`, phase)
      .pipe(catchError(() => of([])));
  }

  /**
   * The C# version sets each record's Email from the signed-in user before posting (like
   * getAllUserJobs). TODO: check whether the API still needs an email on each record once the
   * sign-in token carries the user.
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

  /** UploadAddExcelAsync(List&lt;BudgetRecord&gt;) from ProjectBudget.cs. The workbook is parsed into
   * records first; the raw file isn't sent. */
  uploadParsedBudgetRows(records: BudgetRecord[]): Observable<BudgetRecord[]> {
    return this.http
      .post<BudgetRecord[]>(`${this.base}${ProjectManagementEndpoints.UploadAddExcelUrl}`, records)
      .pipe(catchError(() => of([])));
  }
}
