import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { JobInvoicesData } from '../models/project-management/job-invoice.model';

/**
 * Invoices for a job (Moqups page TAB-Invoices). Works like job-po.service.ts: one GET by job id,
 * and an empty list if it fails.
 *
 * InvoicesController.GetJobInvoices reads the job's Sage invoices (acrinv).
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
