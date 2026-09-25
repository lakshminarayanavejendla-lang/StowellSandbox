import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GlobalEndpoints } from '../global-endpoints';
import { CurrentJob } from '../models/current-job.model';
import { ChartData } from '../models/chart-data.model';

/**
 * Port of IJobService/JobService.cs. The Blazor version resolved the caller's email
 * server-side from the authenticated ClaimsPrincipal (GetUserEmail()); in the SPA that
 * identity comes from the MSAL account instead - the MsalInterceptor attaches the bearer
 * token, and StowellCoAPI is expected to resolve the user from that token rather than from
 * a path segment. Confirm with the API team whether GetCurrentJobs/{email}-style routes
 * still need the email in the URL once auth flows through a real access token.
 */
@Injectable({ providedIn: 'root' })
export class JobService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getCurrentJobs(email: string): Observable<CurrentJob[]> {
    debugger; // TODO: remove once the API team confirms whether the email path segment is still needed
    return this.http
      .get<CurrentJob[]>(`${this.base}${GlobalEndpoints.GetCurrentJobsUrl}/${email}`)
      .pipe(catchError(() => of([])));
  }

  getCashCollectedDatasets(): Observable<ChartData[]> {
    return this.http
      .get<ChartData[]>(`${this.base}${GlobalEndpoints.GetCashCollectedDatasetsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getSampleChartDatasets(email: string): Observable<ChartData[]> {
    return this.http
      .get<ChartData[]>(`${this.base}${GlobalEndpoints.GetSampleChartDatasetsUrl}/${email}`)
      .pipe(catchError(() => of([])));
  }

  getNetCashChart(): Observable<ChartData[]> {
    return this.http
      .get<ChartData[]>(`${this.base}${GlobalEndpoints.GetNetCashChartUrl}`)
      .pipe(catchError(() => of([])));
  }
}
