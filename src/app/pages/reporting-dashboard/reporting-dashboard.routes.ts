import { Routes } from '@angular/router';
import { ReportingDashboardHomeComponent } from './reporting-dashboard-home/reporting-dashboard-home.component';
import { CostCodeSummaryReportComponent } from './cost-code-summary-report/cost-code-summary-report.component';
import { CashFlowForecastComponent } from './cash-flow-forecast/cash-flow-forecast.component';
import { CashFlowToDateComponent } from './cash-flow-to-date/cash-flow-to-date.component';
import { PrimeChangeListComponent } from './prime-change-list/prime-change-list.component';
import { InvoiceReceivableComponent } from './invoice-receivable/invoice-receivable.component';
import { ArInvoiceListComponent } from './ar-invoice-list/ar-invoice-list.component';
import { ContractSummaryComponent } from './contract-summary/contract-summary.component';
import { JobSummaryReportComponent } from './job-summary-report/job-summary-report.component';

/**
 * Reporting Dashboard module routes (Phase 3). Spread into app.routes.ts's MainLayout children
 * as `REPORTING_DASHBOARD_ROUTES` (already imported/wired there - not edited by this phase per
 * instructions).
 *
 * Route mapping vs. the real Blazor @page directives (Components/Pages/ReportingDashboard/):
 *   'reporting-dashboard'                              -> Index.razor            (@page "/ReportingDashboard")
 *   'reporting-dashboard/cost-code-summary-report'      -> CashCodeSummaryReport.razor (@page "/CostCodeSummaryReport")
 *   'reporting-dashboard/cash-flow-forecast'            -> CashFlowForecast.razor (@page "/CashFlowForecast")
 *   'reporting-dashboard/cash-flow-to-date'             -> CashFlowToDateMultiple.razor (@page "/CashFlowToDate")
 *   'reporting-dashboard/prime-change-list'             -> PrimeChangeList.razor  (@page "/PrimeChangeList")
 *   'reporting-dashboard/invoice-receivable'            -> InvoiceReceivable.razor (@page "/InvoiceReceivable")
 *   'reporting-dashboard/ar-invoice-list'                -> ARInvoiceList.razor    (@page "/ARInvoiceList")
 *   'reporting-dashboard/contract-summary'              -> ContractSummary.razor  (@page "/ContractSummary")
 *   'reporting-dashboard/job-summary-report'            -> JobSummaryReport.razor (@page "/JobSummaryReport")
 *
 * All of these were rooted at the top level in the Blazor source (no "/ReportingDashboard/..."
 * prefix on any of them except the Index page itself) - prefixed with 'reporting-dashboard/'
 * here to match this app's convention of namespacing a module's sub-pages under its own path
 * segment (see 'project-management/cash-flow-report/:projectId' etc. in Phase 2), and because
 * NavMenu.razor's "Reports" link already targets exactly '/reporting-dashboard' for the Index page.
 *
 * NOT included here (already real routes owned by the Project Management module - see that
 * module's cash-flow-report/cost-code-summary/job-summary components and this module's
 * ReportingDashboardHomeComponent header comment for how its landing page links to them):
 *   - Index.razor's "Cash Flow Report" link (`/CashFlowReport/0`)
 *   - Index.razor's localStorage-driven "Job Cost Summary Reports" override (`/CostCodeSummary/{id}`)
 */
export const REPORTING_DASHBOARD_ROUTES: Routes = [
  { path: 'reporting-dashboard', component: ReportingDashboardHomeComponent, data: { title: 'Reporting Dashboard' } },
  {
    path: 'reporting-dashboard/cost-code-summary-report',
    component: CostCodeSummaryReportComponent,
    data: { title: 'Cost Code Summary Report' },
  },
  {
    path: 'reporting-dashboard/cash-flow-forecast',
    component: CashFlowForecastComponent,
    data: { title: 'Cash Flow Forecast' },
  },
  {
    path: 'reporting-dashboard/cash-flow-to-date',
    component: CashFlowToDateComponent,
    data: { title: 'Cash Flow To Date - Multiple' },
  },
  {
    path: 'reporting-dashboard/prime-change-list',
    component: PrimeChangeListComponent,
    data: { title: 'Prime Change List' },
  },
  {
    path: 'reporting-dashboard/invoice-receivable',
    component: InvoiceReceivableComponent,
    data: { title: 'Invoice Receivable' },
  },
  {
    path: 'reporting-dashboard/ar-invoice-list',
    component: ArInvoiceListComponent,
    data: { title: 'AR Invoice List' },
  },
  {
    path: 'reporting-dashboard/contract-summary',
    component: ContractSummaryComponent,
    data: { title: 'Contract Summary Report' },
  },
  {
    path: 'reporting-dashboard/job-summary-report',
    component: JobSummaryReportComponent,
    data: { title: 'Job Summary Report' },
  },
];
