import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { CoQueueData } from '../models/project-management/co-queue.model';

/**
 * The CO Queue, built from the Moqups design (page NAV-CO Queue Home). Works like po-queue.service.ts.
 *
 * CoQueueController.GetCoQueueData runs CO_GetQueueData, which reads the Sage change orders in
 * StowellSandbox (prmchg). The catchError is just a safety net.
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
