import { Routes } from '@angular/router';

/**
 * Estimation routes, added to app.routes.ts.
 *
 * 'estimation/bid-queue' and 'estimation/add-bid' are the paths the placeholders used.
 * 'estimation/edit-bid/:jobId' is new; it's Blazor's /Estimation/EditBidForm/{JobId:int}, which had
 * no placeholder.
 */
export const ESTIMATION_ROUTES: Routes = [
  { path: 'estimation/bid-queue', loadComponent: () => import('./bid-queue/bid-queue.component').then((m) => m.BidQueueComponent), data: { title: 'Estimation - Bid Queue' } },
  { path: 'estimation/add-bid', loadComponent: () => import('./bid-form/bid-form.component').then((m) => m.BidFormComponent), data: { title: 'Estimation - New Job/Project Form' } },
  // The Update Project button opens Edit Project (Mike Smith, 2026-09-26). BidFormComponent is unchanged:
  // it still handles New Job/Project above, and its edit mode stays as the previous version of this page.
  { path: 'estimation/edit-bid/:jobId', loadComponent: () => import('./edit-project/edit-project.component').then((m) => m.EditProjectComponent), data: { title: 'Estimation - Edit Project' } },
];
