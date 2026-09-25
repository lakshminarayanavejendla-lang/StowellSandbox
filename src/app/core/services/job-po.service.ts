import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { JobPoOverviewData } from '../models/project-management/job-po.model';

/**
 * NEW service - Stowell PO Module (not a Blazor port; built from the "Stowell PO Module" Moqups
 * design spec, page TAB-Job PO Overview).
 *
 * Backend endpoint now implemented: PoQueueController.GetJobPoOverview -> SAGESBQ's
 * PO_GetJobOverview stored proc (3 result sets: pchord/pcorln-derived PurchaseOrders,
 * prmchg-derived ChangeOrderLog, and BackChargeLog from the new SAGESBQ BackCharges table -
 * back charges have no Sage-native table). catchError kept as a defensive fallback.
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
