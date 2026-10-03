import { Routes } from '@angular/router';

/**
 * Reporting Dashboard routes, imported in app.routes.ts as REPORTING_DASHBOARD_ROUTES.
 *
 * How they map to the Blazor pages:
 *   'reporting-dashboard'                          -> Index.razor            (/ReportingDashboard)
 *   'reporting-dashboard/cost-code-summary-report' -> CashCodeSummaryReport.razor (/CostCodeSummaryReport)
 *   'reporting-dashboard/cash-flow-forecast'       -> CashFlowForecast.razor (/CashFlowForecast)
 *   'reporting-dashboard/cash-flow-to-date'        -> CashFlowToDateMultiple.razor (/CashFlowToDate)
 *   'reporting-dashboard/prime-change-list'        -> PrimeChangeList.razor  (/PrimeChangeList)
 *   'reporting-dashboard/invoice-receivable'       -> InvoiceReceivable.razor (/InvoiceReceivable)
 *   'reporting-dashboard/ar-invoice-list'          -> ARInvoiceList.razor    (/ARInvoiceList)
 *   'reporting-dashboard/contract-summary'         -> ContractSummary.razor  (/ContractSummary)
 *   'reporting-dashboard/job-summary-report'       -> JobSummaryReport.razor (/JobSummaryReport)
 *
 * In Blazor only the Index page was under /ReportingDashboard. Here they all are, like other modules'
 * sub-pages, and the Reports menu link already goes to '/reporting-dashboard'.
 *
 * The Cash Flow Report (/CashFlowReport/0) and Job Cost Summary (/CostCodeSummary/{id}) links on the
 * landing page go to Project Management's existing pages, so they aren't here (see
 * ReportingDashboardHomeComponent).
 */
export const REPORTING_DASHBOARD_ROUTES: Routes = [
  { path: 'reporting-dashboard', loadComponent: () => import('./reporting-dashboard-home/reporting-dashboard-home.component').then((m) => m.ReportingDashboardHomeComponent), data: { title: 'Reporting Dashboard' } },
  // Reports > Monthly Financials opens on its first tab, the Overview (the mockup's first page).
  { path: 'reporting-dashboard/monthly-financials', redirectTo: 'reporting-dashboard/monthly-financials/overview', pathMatch: 'full' },
  // The reports inside Monthly Financials (Statement of Income, AR Aging and so on), each a tab on its page.
  {
    path: 'reporting-dashboard/monthly-financials/backlog/:tab',
    loadComponent: () => import('./monthly-report/monthly-report.component').then((m) => m.MonthlyReportComponent),
    data: { title: 'Backlog Report', report: 'backlog' },
  },
  {
    path: 'reporting-dashboard/monthly-financials/:report',
    loadComponent: () => import('./monthly-report/monthly-report.component').then((m) => m.MonthlyReportComponent),
    data: { title: 'Monthly Financials' },
  },
  {
    path: 'reporting-dashboard/cost-code-summary-report',
    loadComponent: () => import('./cost-code-summary-report/cost-code-summary-report.component').then((m) => m.CostCodeSummaryReportComponent),
    data: { title: 'Cost Code Summary Report' },
  },
  {
    path: 'reporting-dashboard/cash-flow-forecast',
    loadComponent: () => import('./cash-flow-forecast/cash-flow-forecast.component').then((m) => m.CashFlowForecastComponent),
    data: { title: 'Cash Flow Forecast' },
  },
  {
    path: 'reporting-dashboard/cash-flow-to-date',
    loadComponent: () => import('./cash-flow-to-date/cash-flow-to-date.component').then((m) => m.CashFlowToDateComponent),
    data: { title: 'Cash Flow To Date - Multiple' },
  },
  {
    path: 'reporting-dashboard/prime-change-list',
    loadComponent: () => import('./prime-change-list/prime-change-list.component').then((m) => m.PrimeChangeListComponent),
    data: { title: 'Prime Change List' },
  },
  {
    path: 'reporting-dashboard/invoice-receivable',
    loadComponent: () => import('./invoice-receivable/invoice-receivable.component').then((m) => m.InvoiceReceivableComponent),
    data: { title: 'Invoice Receivable' },
  },
  {
    path: 'reporting-dashboard/ar-invoice-list',
    loadComponent: () => import('./ar-invoice-list/ar-invoice-list.component').then((m) => m.ArInvoiceListComponent),
    data: { title: 'AR Invoice List' },
  },
  {
    path: 'reporting-dashboard/contract-summary',
    loadComponent: () => import('./contract-summary/contract-summary.component').then((m) => m.ContractSummaryComponent),
    data: { title: 'Contract Summary Report' },
  },
  {
    path: 'reporting-dashboard/job-summary-report',
    loadComponent: () => import('./job-summary-report/job-summary-report.component').then((m) => m.JobSummaryReportComponent),
    data: { title: 'Job Summary Report' },
  },
];
