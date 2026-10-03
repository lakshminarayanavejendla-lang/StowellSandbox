import { Routes } from '@angular/router';

// Bids / Opportunities routes. 'bids/current-bids', 'bids/bid-queue' and 'bids/new-bid' are the
// paths the placeholders used.
//
// Two routes are new, because the Blazor pages need them:
//   - 'bids/bid-overview/:bidId/:type' (/Bids/BidOverview/{BidId}/{Type}): every bid link in Current
//     Bids and the Bid Queue opens it.
//   - 'bids/documents/:bidId' (/Bids/Documents/{BidId}): the bid's file manager on its own, linked
//     from "Bid Document Library".
//
// There's no route for RootBidFileManagerComponent.razor (/BidsDocManagement/Main); it isn't ported.
export const BIDS_ROUTES: Routes = [
  { path: 'bids/current-bids', loadComponent: () => import('./current-bids/current-bids.component').then((m) => m.CurrentBidsComponent), data: { title: 'Bids' } },
  { path: 'bids/bid-queue', loadComponent: () => import('./bid-queue/bid-queue.component').then((m) => m.BidQueueComponent), data: { title: 'Bid Queue' } },
  { path: 'bids/new-bid', loadComponent: () => import('./new-bid/new-bid.component').then((m) => m.NewBidComponent), data: { title: 'New Bid' } },
  {
    path: 'bids/bid-overview/:bidId/:type',
    loadComponent: () => import('./bid-overview/bid-overview.component').then((m) => m.BidOverviewComponent),
    data: { title: 'Bid Overview' },
  },
  { path: 'bids/documents/:bidId', loadComponent: () => import('./bid-overview/components/bid-file-manager/bid-file-manager.component').then((m) => m.BidFileManagerComponent), data: { title: 'Bid Documents' } },
];
