import { Routes } from '@angular/router';

/**
 * Phoenix Admin routes ("StowellAdmin" in Blazor), imported in app.routes.ts as STOWELL_ADMIN_ROUTES.
 *
 *   /StowellAdmin                  -> 'stowell-admin'                   (landing page)
 *   /StowellAdmin/AdminPanel       -> 'stowell-admin/admin-panel'       (Project Access Management)
 *   /StowellAdmin/DisconnectUsers  -> 'stowell-admin/disconnect-users'  (disconnect all users)
 *
 * The two sub-pages are only reached from the tiles on the landing page.
 */
export const STOWELL_ADMIN_ROUTES: Routes = [
  { path: 'stowell-admin', loadComponent: () => import('./phoenix-admin-index/phoenix-admin-index.component').then((m) => m.PhoenixAdminIndexComponent), data: { title: 'Stowell Admin' } },
  {
    path: 'stowell-admin/admin-panel',
    loadComponent: () => import('./admin-panel/admin-panel.component').then((m) => m.AdminPanelComponent),
    data: { title: 'Stowell Admin - Project Access Management' },
  },
  {
    path: 'stowell-admin/disconnect-users',
    loadComponent: () => import('./disconnect-users/disconnect-users.component').then((m) => m.DisconnectUsersComponent),
    data: { title: 'Stowell Admin - Disconnect Users' },
  },
  // Every API call and error from every user (dbo.ApiCallLog), added 2026-09-24.
  {
    path: 'stowell-admin/api-log',
    loadComponent: () => import('./api-log/api-log.component').then((m) => m.ApiLogComponent),
    data: { title: 'Stowell Admin - API Success & Errors' },
  },
];
