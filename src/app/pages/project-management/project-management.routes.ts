import { Routes } from '@angular/router';
import { ProjectManagementHomeComponent } from './project-management-home/project-management-home.component';

// Project Management routes, added under the main layout in app.routes.ts.
export const PROJECT_MANAGEMENT_ROUTES: Routes = [
  // Project Management opens the Project Queue (Mike Smith: "These queues should match"). The redirect
  // keeps old links working. ProjectManagementHomeComponent isn't used by any route now.
  { path: 'project-management', redirectTo: 'project-queue', pathMatch: 'full' },
  { path: 'project-queue', loadComponent: () => import('./project-queue/project-queue.component').then((m) => m.ProjectQueueComponent), data: { title: 'Project Queue' } },
  {
    path: 'project-management/project-overview/:jobId',
    loadComponent: () => import('./project-overview/project-overview.component').then((m) => m.ProjectOverviewComponent),
    data: { title: 'Project Overview' },
  },
  { path: 'project-management/new-po-form', loadComponent: () => import('./new-po-form/new-po-form.component').then((m) => m.NewPoFormComponent), data: { title: 'New PO Form' } },
  // Editing a submitted PO (see isEditMode in NewPoFormComponent).
  { path: 'project-management/edit-po-form/:poId', loadComponent: () => import('./new-po-form/new-po-form.component').then((m) => m.NewPoFormComponent), data: { title: 'Edit PO' } },
  {
    path: 'project-budget-configuration',
    loadComponent: () => import('./project-budget-configuration/project-budget-configuration.component').then((m) => m.ProjectBudgetConfigurationComponent),
    data: { title: 'Project Budget Configuration' },
  },
  // New route; see the CreateBudgetComponent header.
  {
    path: 'project-budget-configuration/:action/:projectId',
    loadComponent: () => import('./create-budget/create-budget.component').then((m) => m.CreateBudgetComponent),
    data: { title: 'Budget Configuration' },
  },
  // Reports opened in a new tab from the Project Overview tabs.
  {
    path: 'project-management/cash-flow-report/:projectId',
    loadComponent: () => import('./cash-flow-report/cash-flow-report.component').then((m) => m.CashFlowReportComponent),
    data: { title: 'Cash Flow Report' },
  },
  {
    path: 'project-management/cost-code-summary/:projectId',
    loadComponent: () => import('./cost-code-summary/cost-code-summary.component').then((m) => m.CostCodeSummaryComponent),
    data: { title: 'Cost Code Summary Report' },
  },
  {
    path: 'project-management/job-summary/:projectId',
    loadComponent: () => import('./job-summary/job-summary.component').then((m) => m.JobSummaryComponent),
    data: { title: 'Job Summary Report' },
  },
  // PO module pages (see po-queue.component.ts). Not from Blazor.
  { path: 'project-management/po-queue', loadComponent: () => import('./po-queue/po-queue.component').then((m) => m.PoQueueComponent), data: { title: 'PO Queue' } },
  { path: 'project-management/co-queue', loadComponent: () => import('./co-queue/co-queue.component').then((m) => m.CoQueueComponent), data: { title: 'CO Queue' } },
  { path: 'project-management/new-co-form', loadComponent: () => import('./new-co-form/new-co-form.component').then((m) => m.NewCoFormComponent), data: { title: 'New CO Form' } },
  // Editing a submitted CO (see isEditMode in NewCoFormComponent).
  { path: 'project-management/edit-co-form/:coId', loadComponent: () => import('./new-co-form/new-co-form.component').then((m) => m.NewCoFormComponent), data: { title: 'Edit CO' } },

  // From the updated Moqups (FORM-PO Request Approval, FORM-CO Request Approval, FORM-CO Reallocation
  // and FORM-CO Allocation). The approval routes reuse NewPoFormComponent and NewCoFormComponent with
  // `data: { mode: 'approval' }`. They're separate from the edit-po-form and edit-co-form routes
  // above; those components' headers explain how the two modes stay apart with the same :poId or :coId.
  {
    path: 'project-management/po-request-approval/:poId',
    loadComponent: () => import('./new-po-form/new-po-form.component').then((m) => m.NewPoFormComponent),
    data: { title: 'Purchase Order Request Approval', mode: 'approval' },
  },
  {
    path: 'project-management/co-request-approval/:coId',
    loadComponent: () => import('./new-co-form/new-co-form.component').then((m) => m.NewCoFormComponent),
    data: { title: 'Change Order Request Approval', mode: 'approval' },
  },
  {
    // One page now (see co-budget-allocation.model.ts). co-budget-reallocation stays as another name
    // for it; nothing else linked to either path yet, so merging them was safe.
    path: 'project-management/co-budget-allocation',
    loadComponent: () => import('./co-budget-allocation/co-budget-allocation.component').then((m) => m.CoBudgetAllocationComponent),
    data: { title: 'Change Order Budget Allocation' },
  },
  {
    path: 'project-management/co-budget-allocation/:allocationId',
    loadComponent: () => import('./co-budget-allocation/co-budget-allocation.component').then((m) => m.CoBudgetAllocationComponent),
    data: { title: 'Change Order Budget Allocation' },
  },
  {
    path: 'project-management/co-budget-reallocation/:allocationId',
    loadComponent: () => import('./co-budget-allocation/co-budget-allocation.component').then((m) => m.CoBudgetAllocationComponent),
    data: { title: 'Change Order Budget Allocation' },
  },
  // Accounting approval of a submitted allocation (Mike Smith, 2026-09-26): the same page, read-only, with Approve and Reject.
  {
    path: 'project-management/co-budget-allocation-approval/:requestId',
    loadComponent: () => import('./co-budget-allocation/co-budget-allocation.component').then((m) => m.CoBudgetAllocationComponent),
    data: { title: 'Change Order Budget Allocation - Approval' },
  },

  // The job access audit trail (see job-access-log.component.ts). It's not in the menu, as asked;
  // the Stowell Admin page has a tile for it.
  {
    path: 'project-management/job-access-log',
    loadComponent: () => import('./job-access-log/job-access-log.component').then((m) => m.JobAccessLogComponent),
    data: { title: 'Job Access Log' },
  },
];
