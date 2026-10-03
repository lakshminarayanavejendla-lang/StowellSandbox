import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { BudgetLogEntry } from '../models/project-management/budget-log.model';

/**
 * The Budget Log table under the budget summary (Moqups page TAB-Budget/Financials). Works like
 * job-invoice.service.ts: one GET by job id, and an empty list if it fails. There's no API or Sage
 * table for it yet; GetBudgetLogUrl is a placeholder, like GetJobInvoicesUrl.
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
