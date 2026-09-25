import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { BudgetLogEntry } from '../models/project-management/budget-log.model';

/**
 * NEW service - client-updated Moqups (page TAB-Budget/Financials, the "Budget Log" table under
 * the Total Budget/Paid/Remaining summary). Mirrors job-invoice.service.ts's pattern (single
 * GET-by-jobId, empty-array fallback). No backend endpoint or Sage table mapping has been
 * confirmed for this yet - GetBudgetLogUrl is a placeholder route name only, same status as
 * GetJobInvoicesUrl.
 */
@Injectable({ providedIn: 'root' })
export class BudgetLogService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getBudgetLog(jobId: number): Observable<BudgetLogEntry[]> {
    return this.http
      .get<BudgetLogEntry[]>(`${this.base}${ProjectManagementEndpoints.GetBudgetLogUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }
}
