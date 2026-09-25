import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { CoQueueData } from '../models/project-management/co-queue.model';

/**
 * NEW service - Stowell PO Module (not a Blazor port; built from the "Stowell PO Module" Moqups
 * design spec, page NAV-CO Queue Home). Mirrors po-queue.service.ts.
 *
 * Backend endpoint now implemented: CoQueueController.GetCoQueueData -> SAGESBQ's
 * CO_GetQueueData stored proc, cross-DB joining StowellSandbox.dbo.prmchg (real Sage Change
 * Order records). catchError kept as a defensive fallback, not because the endpoint is missing.
 */
@Injectable({ providedIn: 'root' })
export class CoQueueService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getCoQueueData(): Observable<CoQueueData> {
    return this.http
      .get<CoQueueData>(`${this.base}${ProjectManagementEndpoints.GetCoQueueDataUrl}`)
      .pipe(catchError(() => of({ activeCOs: [], completedCOs: [] })));
  }
}
