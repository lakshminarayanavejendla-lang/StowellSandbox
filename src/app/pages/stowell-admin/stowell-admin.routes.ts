import { Routes } from '@angular/router';
import { PhoenixAdminIndexComponent } from './phoenix-admin-index/phoenix-admin-index.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { DisconnectUsersComponent } from './disconnect-users/disconnect-users.component';
import { ApiLogComponent } from './api-log/api-log.component';

/**
 * Phoenix Admin ("StowellAdmin" in the Blazor source) module routes - merged into
 * app.routes.ts's children array by whoever owns that file (per this phase's
 * collision-avoidance rules, this file does not edit app.routes.ts directly - it's already
 * imported there as `STOWELL_ADMIN_ROUTES`, replacing the old 'stowell-admin'
 * PlaceholderComponent stub for NavMenu.razor's "Phoenix Admin" link).
 *
 * Path mapping from the real @page directives:
 *   @page "/StowellAdmin"                    -> 'stowell-admin'                  (landing page)
 *   @page "/StowellAdmin/AdminPanel"         -> 'stowell-admin/admin-panel'      (Project Access Management)
 *   @page "/StowellAdmin/DisconnectUsers"    -> 'stowell-admin/disconnect-users' (force-disconnect all users)
 *
 * 'stowell-admin' matches the Phase 1 placeholder path 1:1; the other two are NEW routes not in
 * the original stub list - Phase 1 only stubbed the top-level nav link, not the two sub-pages
 * reachable only from the tiles on the StowellAdmin landing page itself.
 */
export const STOWELL_ADMIN_ROUTES: Routes = [
  { path: 'stowell-admin', component: PhoenixAdminIndexComponent, data: { title: 'Stowell Admin' } },
  {
    path: 'stowell-admin/admin-panel',
    component: AdminPanelComponent,
    data: { title: 'Stowell Admin - Project Access Management' },
  },
  {
    path: 'stowell-admin/disconnect-users',
    component: DisconnectUsersComponent,
    data: { title: 'Stowell Admin - Disconnect Users' },
  },
  // NEW (2026-09-24) - every API call and error, from every user (dbo.ApiCallLog).
  {
    path: 'stowell-admin/api-log',
    component: ApiLogComponent,
    data: { title: 'Stowell Admin - API Success & Errors' },
  },
];
