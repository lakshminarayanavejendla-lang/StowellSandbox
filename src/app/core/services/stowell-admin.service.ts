import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StowellAdminEndpoints } from '../stowell-admin-endpoints';

/**
 * Port of IStowellAdminService/StowellAdminService.cs - backs DisconnectUsers.razor.
 *
 * SECURITY-RELEVANT: `ProcessDisconnectUsers()` in the C# source POSTs with no request body and
 * no target user/session filter - it is an unconditional "disconnect every currently logged-in
 * user" action, not a per-user disconnect. There is no confirmation dialog in the Blazor source
 * either (DisconnectUsers.razor's button calls this directly on click). Reproduced as-is; flag
 * this for the team - a single unconfirmed click force-logs-out the entire user base, which
 * seems like it warrants a confirmation prompt before going live, even though that's not what
 * the source does today.
 *
 * The C# method also swallows all exceptions itself (try/catch, log-only, no rethrow) and
 * NEVER surfaces failure to the caller - DisconnectUsers.razor always shows the "success" toast
 * regardless of whether the POST actually succeeded. That looks like a bug (a real network/500
 * failure would be silently reported as success), so this port intentionally does NOT reproduce
 * that swallow: the Observable reflects the real HTTP outcome and the component shows a genuine
 * error message on failure. Flagging this as a deliberate deviation from source behavior.
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
