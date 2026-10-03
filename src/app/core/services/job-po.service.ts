import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { JobPoOverviewData } from '../models/project-management/job-po.model';

/**
 * The job's PO overview, built from the Moqups design (page TAB-Job PO Overview), not ported from
 * Blazor.
 *
 * PoQueueController.GetJobPoOverview runs PO_GetJobOverview, which returns three lists: purchase
 * orders (from pchord and pcorln), the change order log (from prmchg) and the back charge log (from
 * the BackCharges table in SAGESBQ, since Sage has none). The catchError is just a safety net.
 */
@Injectable({ providedIn: 'root' })
export class JobPoService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getJobPoOverview(jobId: number): Observable<JobPoOverviewData> {
    return this.http
      .get<JobPoOverviewData>(`${this.base}${ProjectManagementEndpoints.GetJobPoOverviewUrl}/${jobId}`)
      .pipe(catchError(() => of({ purchaseOrders: [], changeOrderLog: [], backChargeLog: [] })));
  }
}
