import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { JobAccessLogRecord } from '../models/project-management/job-access-log.model';

// Job access audit trail (new feature, not a Blazor port). Backed by JobAccessController.cs /
// dbo.JobAccessLog. logAccess() is called fire-and-forget from ProjectOverviewComponent.ngOnInit;
// getLog() backs the un-navigated job-access-log page.
@Injectable({ providedIn: 'root' })
export class JobAccessLogService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  logAccess(jobId: string, userEmail: string): Observable<{ logged: boolean }> {
    return this.http
      .post<{ logged: boolean }>(`${this.base}${ProjectManagementEndpoints.LogJobAccessUrl}`, { jobId, userEmail })
      .pipe(catchError(() => of({ logged: false })));
  }

  getLog(): Observable<JobAccessLogRecord[]> {
    return this.http
      .get<JobAccessLogRecord[]>(`${this.base}${ProjectManagementEndpoints.GetJobAccessLogUrl}`)
      .pipe(catchError(() => of([])));
  }
}
