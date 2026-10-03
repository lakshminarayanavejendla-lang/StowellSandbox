import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VendorOption } from '../models/project-management/vendor.model';

/**
 * The vendor picker on the PO Request and CO Request forms. PoQueueController.GetVendors reads
 * StowellSandbox.dbo.actpay (about 1,166 rows). shareReplay keeps it for the session, since the
 * vendor list doesn't change while someone fills in a form.
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
