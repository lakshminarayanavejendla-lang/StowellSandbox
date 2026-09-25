import { Routes } from '@angular/router';
import { BidQueueComponent } from './bid-queue/bid-queue.component';
import { BidFormComponent } from './bid-form/bid-form.component';

/**
 * Estimation module routes - to be merged into app.routes.ts's children array by whoever owns
 * that file (per this phase's collision-avoidance rules, this file does not edit
 * app.routes.ts directly).
 *
 * 'estimation/bid-queue' and 'estimation/add-bid' match the Phase 1 placeholder paths 1:1.
 * 'estimation/edit-bid/:jobId' is a NEW route not present as a placeholder - the Blazor source
 * has `@page "/Estimation/EditBidForm/{JobId:int}"` (EditBidForm.razor), which the placeholder
 * stubs never accounted for. Flagging this discrepancy per the task instructions.
 */
export const ESTIMATION_ROUTES: Routes = [
  { path: 'estimation/bid-queue', component: BidQueueComponent, data: { title: 'Estimation - Bid Queue' } },
  { path: 'estimation/add-bid', component: BidFormComponent, data: { title: 'Estimation - New Job/Project Form' } },
  { path: 'estimation/edit-bid/:jobId', component: BidFormComponent, data: { title: 'Estimation - Edit Bid' } },
];
