import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VendorOption } from '../models/project-management/vendor.model';

/**
 * NEW service - Stowell PO Module. Backs the vendor picker on FORM-PO Request / FORM-CO Request.
 * Backend: PoQueueController.GetVendors, a plain read of StowellSandbox.dbo.actpay (~1,166 rows) -
 * cached for the session via shareReplay since the vendor master doesn't change during a form
 * session and there's no reason to refetch it on every job change.
 */
@Injectable({ providedIn: 'root' })
export class VendorService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  private vendors$ = this.http.get<VendorOption[]>(`${this.base}api/PoQueue/GetVendors`).pipe(
    catchError(() => of([])),
    shareReplay(1)
  );

  getVendors(): Observable<VendorOption[]> {
    return this.vendors$;
  }
}
