import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StowellAdminEndpoints } from '../stowell-admin-endpoints';

/**
 * Ported from StowellAdminService.cs, for the Disconnect Users page.
 *
 * Security: ProcessDisconnectUsers() sends no body and no user filter, so it signs out everyone
 * who is logged in. The Blazor button did this on one click with no confirmation. Kept that way
 * here, but it should probably ask for confirmation before going live.
 *
 * The C# method also caught every error and the page always showed "success", even when the
 * request failed. This version doesn't hide errors: the Observable fails when the request fails,
 * and the page shows an error. That's a deliberate change from the original.
 */
@Injectable({ providedIn: 'root' })
export class StowellAdminService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  processDisconnectUsers(): Observable<boolean> {
    return this.http
      .post(`${this.base}${StowellAdminEndpoints.GetProcessDisconnectUsersUrl}`, null)
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }
}
