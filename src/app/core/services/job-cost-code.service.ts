import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JobCostCodeOption } from '../models/project-management/job-cost-code.model';

/**
 * NEW service - Stowell PO Module. Backs the cost code picker on FORM-PO Request / FORM-CO
 * Request. Backend: PoQueueController.GetJobCostCodes/{jobId} -> SAGESBQ's PO_GetJobCostCodes,
 * scoped to the selected job's real budget lines (not the full ~4,000-row cost code catalog).
 */
@Injectable({ providedIn: 'root' })
export class JobCostCodeService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getJobCostCodes(jobId: string): Observable<JobCostCodeOption[]> {
    return this.http
      .get<JobCostCodeOption[]>(`${this.base}api/PoQueue/GetJobCostCodes/${jobId}`)
      .pipe(catchError(() => of([])));
  }
}
