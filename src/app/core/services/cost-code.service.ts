import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountingEndpoints } from '../accounting-endpoints';
import { CostCodeRecord, Phase, PhaseListResponse } from '../models/accounting/budget.model';
import { AuthService } from './auth.service';

/**
 * The three CostCodeService.cs methods Accounting uses: GetAllUserJobs and GetJobPhasesData for the
 * budget approval job and phase dropdowns, and GetAllPhases for the Add Form's Additional Phases
 * popup. The other ~15 methods are for reporting pages (see project-cost-code.service.ts); port
 * them with the page that uses them.
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

  // This is the only call that comes wrapped as { data: [...] } (ApiListResponse<Phase>); the
  // others return a plain array. Check that against the real API.
  getAllPhases(): Observable<Phase[]> {
    return this.http.get<PhaseListResponse>(`${this.base}${AccountingEndpoints.GetAllPhasesUrl}`).pipe(
      map((res) => res?.data ?? []),
      catchError(() => of([]))
    );
  }
}
