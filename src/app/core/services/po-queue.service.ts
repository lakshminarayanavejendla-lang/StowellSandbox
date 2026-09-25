import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { PoQueueData } from '../models/project-management/po-queue.model';

/**
 * NEW service - Stowell PO Module (not a Blazor port; this module doesn't exist in the source
 * app). Built from the "Stowell PO Module" Moqups design spec (pages WF-Initial Job PO Workflow,
 * NAV-PO Queue Home).
 *
 * Backend endpoint now implemented: PoQueueController.GetPoQueueData -> SAGESBQ's
 * PO_GetQueueData stored proc, cross-DB joining StowellSandbox.dbo.pchord (real Sage PO records)
 * with actrec (job name) and ProjectManagement (PM email). catchError kept as a defensive
 * fallback, not because the endpoint is missing.
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
