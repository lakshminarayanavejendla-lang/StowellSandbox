import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PlaceholderComponent } from './pages/placeholder/placeholder.component';
import { StubPageComponent } from './pages/stub-page/stub-page.component';
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
import { HrDetailsComponent } from './pages/hr/hr-details/hr-details.component';

// Route list mirrors NavMenu.razor's href targets 1:1 so every nav link stays live even
// before its module is converted - each placeholder becomes a real page in a later phase.
//
// Phase 2 (Project Management, Bids, Estimation, Accounting) replaced their placeholder stubs
// with the real routed modules below. Everything still under PlaceholderComponent is unconverted.
export const routes: Routes = [
  // FIX - these two were the only routes in the app with no `data.title` at all (every other
  // route already had one - see PageTitleService's header comment for why none of them were
  // actually reaching the browser tab until now).
  { path: 'logged-out', component: LoggedOutComponent, data: { title: 'Logged Out' } },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardComponent, pathMatch: 'full', data: { title: 'Dashboard' } },
      // Faithful ports - the Blazor source for all seven of these is itself just a bare
      // <h3>Title</h3><hr /> stub, nothing left to convert (see StubPageComponent's header comment).
      { path: 'opps-pipeline', component: StubPageComponent, data: { title: 'Opps Pipeline' } },
      { path: 'hr', component: HrDetailsComponent, data: { title: 'Hr' } },
      { path: 'bi-reports', component: StubPageComponent, data: { title: 'BI Reports' } },
      { path: 'sys-ops', component: StubPageComponent, data: { title: 'SysOps' } },
      { path: 'dev-ops', component: StubPageComponent, data: { title: 'DevOps' } },
      { path: 'vendor-management', component: StubPageComponent, data: { title: 'Vendor Management' } },
      { path: 'compliance', component: StubPageComponent, data: { title: 'Compliance' } },
      { path: 'legal', component: StubPageComponent, data: { title: 'Legal' } },

      // --- Phase 2: Project Management ---
      ...PROJECT_MANAGEMENT_ROUTES,

      // --- Phase 2: Bids / Opportunities ---
      ...BIDS_ROUTES,

      // --- Phase 2: Estimation ---
      ...ESTIMATION_ROUTES,

      // --- Phase 2: Accounting (nested - accountingRoutes paths are relative to 'accounting') ---
      { path: 'accounting', children: accountingRoutes },

      // --- Phase 3: Contacts, Document Management, Reporting Dashboard, Phoenix Admin ---
      ...CONTACTS_ROUTES,
      ...DOCUMENT_MANAGEMENT_ROUTES,
      ...REPORTING_DASHBOARD_ROUTES,
      ...STOWELL_ADMIN_ROUTES,

      { path: '**', component: PlaceholderComponent, data: { title: 'Page not found' } },
    ],
  },
];
