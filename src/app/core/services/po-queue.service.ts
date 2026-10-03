import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { PoQueueData } from '../models/project-management/po-queue.model';

/**
 * The PO Queue, built from the Moqups design (pages WF-Initial Job PO Workflow and NAV-PO Queue
 * Home). The Blazor app had no PO module.
 *
 * PoQueueController.GetPoQueueData runs PO_GetQueueData, which joins the Sage POs in
 * StowellSandbox (pchord) with actrec for the job name and ProjectManagement for the PM's email.
 * The catchError is just a safety net.
 */
@Injectable({ providedIn: 'root' })
export class PoQueueService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getPoQueueData(): Observable<PoQueueData> {
    return this.http
      .get<PoQueueData>(`${this.base}${ProjectManagementEndpoints.GetPoQueueDataUrl}`)
      .pipe(catchError(() => of({ activePOs: [], completedPOs: [] })));
  }
}
