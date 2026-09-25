import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { JobInvoicesData } from '../models/project-management/job-invoice.model';

/**
 * NEW service - Stowell PO/CO Module mockup update (page TAB-Invoices). Mirrors
 * job-po.service.ts's pattern exactly (single GET-by-jobId call, empty-array fallback on error).
 *
 * FLAG: unlike GetJobPoOverviewUrl (backed by a real PO_GetJobOverview stored proc against
 * pchord/prmchg), no backend endpoint or Sage table mapping has been confirmed for job-scoped AR
 * invoices yet - GetJobInvoicesUrl below is a placeholder route name only. The likely real
 * source is dbo.acrinv (see the AR-invoice query already built for Sage 100 Contractor reporting
 * elsewhere in this project) filtered by jobnum, but wiring that up is a backend task, not
 * something this Angular-only change can confirm.
 */
@Injectable({ providedIn: 'root' })
export class JobInvoiceService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getJobInvoices(jobId: number): Observable<JobInvoicesData> {
    return this.http
      .get<JobInvoicesData>(`${this.base}${ProjectManagementEndpoints.GetJobInvoicesUrl}/${jobId}`)
      .pipe(catchError(() => of({ invoices: [] })));
  }
}
