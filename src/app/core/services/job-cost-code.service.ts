import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JobCostCodeOption } from '../models/project-management/job-cost-code.model';

/**
 * The cost code picker on the PO Request and CO Request forms. PoQueueController.GetJobCostCodes/{jobId}
 * runs PO_GetJobCostCodes, which returns only the job's own budget lines, not all ~4,000 cost codes.
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
