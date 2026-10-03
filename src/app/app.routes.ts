import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PlaceholderComponent } from './pages/placeholder/placeholder.component';
import { LoggedOutComponent } from './pages/logged-out/logged-out.component';
import { authGuard } from './core/auth/auth.guard';

import { PROJECT_MANAGEMENT_ROUTES } from './pages/project-management/project-management.routes';
import { BIDS_ROUTES } from './pages/bids/bids.routes';
import { ESTIMATION_ROUTES } from './pages/estimation/estimation.routes';
import { accountingRoutes } from './pages/accounting/accounting.routes';
import { CONTACTS_ROUTES } from './pages/contacts/contacts.routes';
import { DOCUMENT_MANAGEMENT_ROUTES } from './pages/document-management/document-management.routes';
import { REPORTING_DASHBOARD_ROUTES } from './pages/reporting-dashboard/reporting-dashboard.routes';
import { STOWELL_ADMIN_ROUTES } from './pages/stowell-admin/stowell-admin.routes';

// The routes match NavMenu.razor's links one for one, so every menu link works. Pages not converted
// yet still use PlaceholderComponent.
export const routes: Routes = [
  // These two need a data.title too, for the browser tab (see PageTitleService).
  { path: 'logged-out', component: LoggedOutComponent, data: { title: 'Logged Out' } },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardComponent, pathMatch: 'full', data: { title: 'Dashboard' } },
      // In Blazor all seven of these are just a heading and a line, so there's nothing more to port
      // (see StubPageComponent).
      { path: 'opps-pipeline', loadComponent: () => import('./pages/stub-page/stub-page.component').then((m) => m.StubPageComponent), data: { title: 'Opps Pipeline' } },
      { path: 'hr', loadComponent: () => import('./pages/hr/hr-details/hr-details.component').then((m) => m.HrDetailsComponent), data: { title: 'Hr' } },
      { path: 'bi-reports', loadComponent: () => import('./pages/stub-page/stub-page.component').then((m) => m.StubPageComponent), data: { title: 'BI Reports' } },
      { path: 'sys-ops', loadComponent: () => import('./pages/stub-page/stub-page.component').then((m) => m.StubPageComponent), data: { title: 'SysOps' } },
      { path: 'dev-ops', loadComponent: () => import('./pages/stub-page/stub-page.component').then((m) => m.StubPageComponent), data: { title: 'DevOps' } },
      { path: 'vendor-management', loadComponent: () => import('./pages/stub-page/stub-page.component').then((m) => m.StubPageComponent), data: { title: 'Vendor Management' } },
      { path: 'compliance', loadComponent: () => import('./pages/stub-page/stub-page.component').then((m) => m.StubPageComponent), data: { title: 'Compliance' } },
      { path: 'legal', loadComponent: () => import('./pages/stub-page/stub-page.component').then((m) => m.StubPageComponent), data: { title: 'Legal' } },

      // --- Project Management ---
      ...PROJECT_MANAGEMENT_ROUTES,

      // --- Bids / Opportunities ---
      ...BIDS_ROUTES,

      // --- Estimation ---
      ...ESTIMATION_ROUTES,

      // --- Accounting (accountingRoutes paths are relative to 'accounting') ---
      { path: 'accounting', children: accountingRoutes },

      // --- Contacts, Document Management, Reporting Dashboard, Phoenix Admin ---
      ...CONTACTS_ROUTES,
      ...DOCUMENT_MANAGEMENT_ROUTES,
      ...REPORTING_DASHBOARD_ROUTES,
      ...STOWELL_ADMIN_ROUTES,

      { path: '**', component: PlaceholderComponent, data: { title: 'Page not found' } },
    ],
  },
];
