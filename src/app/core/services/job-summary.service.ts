import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { CostCodeSummaryRecord } from '../models/project-management/cost-summary.model';

// Port of Services/IJobSummaryService.cs + JobSummaryService.cs - backs the Job Summary Report
// page (/JobSummary/{ProjectId}).
@Injectable({ providedIn: 'root' })
export class JobSummaryService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getJobCostSummaryRecords(recnum = ''): Observable<CostCodeSummaryRecord[]> {
    const url = recnum
      ? `${ProjectManagementEndpoints.GetJobCostSummaryRecordsWithRecnumUrl}/${recnum}`
      : ProjectManagementEndpoints.GetJobCostSummaryRecordsUrl;
    return this.http.get<CostCodeSummaryRecord[]>(`${this.base}${url}`).pipe(catchError(() => of([])));
  }
}
