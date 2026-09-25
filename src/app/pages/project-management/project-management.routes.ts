import { Routes } from '@angular/router';
import { ProjectManagementHomeComponent } from './project-management-home/project-management-home.component';
import { ProjectQueueComponent } from './project-queue/project-queue.component';
import { ProjectOverviewComponent } from './project-overview/project-overview.component';
import { ProjectBudgetConfigurationComponent } from './project-budget-configuration/project-budget-configuration.component';
import { CreateBudgetComponent } from './create-budget/create-budget.component';
import { NewPoFormComponent } from './new-po-form/new-po-form.component';
import { CashFlowReportComponent } from './cash-flow-report/cash-flow-report.component';
import { CostCodeSummaryComponent } from './cost-code-summary/cost-code-summary.component';
import { JobSummaryComponent } from './job-summary/job-summary.component';
import { PoQueueComponent } from './po-queue/po-queue.component';
import { CoQueueComponent } from './co-queue/co-queue.component';
import { NewCoFormComponent } from './new-co-form/new-co-form.component';
import { CoBudgetAllocationComponent } from './co-budget-allocation/co-budget-allocation.component';
import { JobAccessLogComponent } from './job-access-log/job-access-log.component';

// Project Management module routes (Phase 2). NOT wired into app.routes.ts by this agent per
// instructions (that file is shared across all Phase-2 modules being converted in parallel) -
// hand these to whoever owns app.routes.ts to splice in as children of the MainLayout route,
// replacing the five existing PlaceholderComponent stubs for this module and adding the three
// new report routes + the create-budget route (see this phase's final report for the mapping).
export const PROJECT_MANAGEMENT_ROUTES: Routes = [
  // Project Management now lands on the Project Queue (Mike Smith - "These queues should match");
  // redirect keeps old bookmarks/links working. ProjectManagementHomeComponent is no longer routed.
  { path: 'project-management', redirectTo: 'project-queue', pathMatch: 'full' },
  { path: 'project-queue', component: ProjectQueueComponent, data: { title: 'Project Queue' } },
  {
    path: 'project-management/project-overview/:jobId',
    component: ProjectOverviewComponent,
    data: { title: 'Project Overview' },
  },
  { path: 'project-management/new-po-form', component: NewPoFormComponent, data: { title: 'New PO Form' } },
  // NEW - edit-on-click for an already-submitted PO (see NewPoFormComponent's isEditMode).
  { path: 'project-management/edit-po-form/:poId', component: NewPoFormComponent, data: { title: 'Edit PO' } },
  {
    path: 'project-budget-configuration',
    component: ProjectBudgetConfigurationComponent,
    data: { title: 'Project Budget Configuration' },
  },
  // New - not one of the original five stub routes, see CreateBudgetComponent header comment.
  {
    path: 'project-budget-configuration/:action/:projectId',
    component: CreateBudgetComponent,
    data: { title: 'Budget Configuration' },
  },
  // New - reports opened via target="_blank" links from the Project Overview tabs.
  {
    path: 'project-management/cash-flow-report/:projectId',
    component: CashFlowReportComponent,
    data: { title: 'Cash Flow Report' },
  },
  {
    path: 'project-management/cost-code-summary/:projectId',
    component: CostCodeSummaryComponent,
    data: { title: 'Cost Code Summary Report' },
  },
  {
    path: 'project-management/job-summary/:projectId',
    component: JobSummaryComponent,
    data: { title: 'Job Summary Report' },
  },
  // NEW - Stowell PO Module (see po-queue.component.ts header comment; not a Blazor port).
  { path: 'project-management/po-queue', component: PoQueueComponent, data: { title: 'PO Queue' } },
  { path: 'project-management/co-queue', component: CoQueueComponent, data: { title: 'CO Queue' } },
  { path: 'project-management/new-co-form', component: NewCoFormComponent, data: { title: 'New CO Form' } },
  // NEW - edit-on-click for an already-submitted CO (see NewCoFormComponent's isEditMode).
  { path: 'project-management/edit-co-form/:coId', component: NewCoFormComponent, data: { title: 'Edit CO' } },

  // NEW - client-updated Moqups (pages FORM-PO Request Approval / FORM-CO Request Approval /
  // FORM-CO Reallocation / FORM-CO Allocation). Approval routes reuse NewPoFormComponent/
  // NewCoFormComponent via `data: { mode: 'approval' }` - distinct from the edit-po-form/
  // edit-co-form routes above (isEditMode); see those components' header comments for how the
  // two modes stay mutually exclusive despite sharing the same `:poId`/`:coId` param shape.
  {
    path: 'project-management/po-request-approval/:poId',
    component: NewPoFormComponent,
    data: { title: 'Purchase Order Request Approval', mode: 'approval' },
  },
  {
    path: 'project-management/co-request-approval/:coId',
    component: NewCoFormComponent,
    data: { title: 'Change Order Request Approval', mode: 'approval' },
  },
  {
    // UPDATED - single unified page now (see co-budget-allocation.model.ts header comment);
    // co-budget-reallocation kept as an alias route since nothing outside this file links to
    // either path yet, so no risk in consolidating.
    path: 'project-management/co-budget-allocation',
    component: CoBudgetAllocationComponent,
    data: { title: 'Change Order Budget Allocation' },
  },
  {
    path: 'project-management/co-budget-allocation/:allocationId',
    component: CoBudgetAllocationComponent,
    data: { title: 'Change Order Budget Allocation' },
  },
  {
    path: 'project-management/co-budget-reallocation/:allocationId',
    component: CoBudgetAllocationComponent,
    data: { title: 'Change Order Budget Allocation' },
  },

  // NEW - job access audit trail (see job-access-log.component.ts header comment). Deliberately
  // not linked from nav-menu.component.ts - reachable only by direct URL, per request.
  {
    path: 'project-management/job-access-log',
    component: JobAccessLogComponent,
    data: { title: 'Job Access Log' },
  },
];
