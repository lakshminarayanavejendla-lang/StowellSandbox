import { Routes } from '@angular/router';
import { AccountingQueueComponent } from './accounting-queue/accounting-queue.component';
import { PoQueueComponent } from './po-queue/po-queue.component';
import { AddFormComponent } from './add-form/add-form.component';
import { BudgetApprovalComponent } from './budget-approval/budget-approval.component';

// Real routes for the Accounting module, replacing app.routes.ts's single
// { path: 'accounting', component: PlaceholderComponent } stub. Merge these into the
// 'accounting' parent's children (or import + spread this array) - not applied directly to
// app.routes.ts here to avoid colliding with the other in-flight module conversions.
//
// Path choices mirror the Blazor @page directives 1:1:
//   /Accounting                              -> accounting-queue ("Active Projects" grid)
//   /Accounting/POQueue                       -> po-queue (static/unwired in source - see flag there)
//   /Accounting/AddForm/{JobId}               -> add-form/:jobId
//   /Accounting/ApproveNewBudget/{ProjectId}  -> approve-new-budget/:projectId
//   /Accounting/ApproveModifyBudget/{ProjectId} -> approve-modify-budget/:projectId
// The last two share one component (BudgetApprovalComponent) - see that component's header
// comment for why: the two Blazor pages are a copy/paste duplicate of the same flow.
export const accountingRoutes: Routes = [
  { path: '', component: AccountingQueueComponent, data: { title: 'Accounting' } },
  { path: 'po-queue', component: PoQueueComponent, data: { title: 'Accounting - PO Queue' } },
  { path: 'add-form/:jobId', component: AddFormComponent, data: { title: 'Accounting - Add Form' } },
  {
    path: 'approve-new-budget/:projectId',
    component: BudgetApprovalComponent,
    data: { title: 'Accounting Budget Creation', mode: 'new' },
  },
  {
    path: 'approve-modify-budget/:projectId',
    component: BudgetApprovalComponent,
    data: { title: 'Accounting Budget Updation', mode: 'modify' },
  },
];
