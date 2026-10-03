import { Routes } from '@angular/router';

// Accounting routes, added under the 'accounting' parent in app.routes.ts.
//
// They match the Blazor pages:
//   /Accounting                                 -> accounting-queue ("Active Projects" grid)
//   /Accounting/POQueue                         -> po-queue
//   /Accounting/AddForm/{JobId}                 -> add-form/:jobId
//   /Accounting/ApproveNewBudget/{ProjectId}    -> approve-new-budget/:projectId
//   /Accounting/ApproveModifyBudget/{ProjectId} -> approve-modify-budget/:projectId
// The last two use one component, BudgetApprovalComponent, because the two Blazor pages are copies
// of the same flow (see that component's header).
export const accountingRoutes: Routes = [
  { path: '', loadComponent: () => import('./accounting-queue/accounting-queue.component').then((m) => m.AccountingQueueComponent), data: { title: 'Accounting' } },
  { path: 'po-queue', loadComponent: () => import('./po-queue/po-queue.component').then((m) => m.PoQueueComponent), data: { title: 'Accounting - PO Queue' } },
  { path: 'co-queue', loadComponent: () => import('./co-queue/co-queue.component').then((m) => m.AccountingCoQueueComponent), data: { title: 'Accounting - CO Queue' } },
  { path: 'invoice-queue', loadComponent: () => import('./invoice-queue/invoice-queue.component').then((m) => m.AccountingInvoiceQueueComponent), data: { title: 'Accounting - Invoice Queue' } },
  { path: 'add-form/:jobId', loadComponent: () => import('./add-form/add-form.component').then((m) => m.AddFormComponent), data: { title: 'Accounting - Add Form' } },
  {
    path: 'approve-new-budget/:projectId',
    loadComponent: () => import('./budget-approval/budget-approval.component').then((m) => m.BudgetApprovalComponent),
    data: { title: 'Accounting Budget Creation', mode: 'new' },
  },
  {
    path: 'approve-modify-budget/:projectId',
    loadComponent: () => import('./budget-approval/budget-approval.component').then((m) => m.BudgetApprovalComponent),
    data: { title: 'Accounting Budget Updation', mode: 'modify' },
  },
];
