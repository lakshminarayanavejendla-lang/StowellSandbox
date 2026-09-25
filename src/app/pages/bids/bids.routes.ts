import { Routes } from '@angular/router';
import { CurrentBidsComponent } from './current-bids/current-bids.component';
import { BidQueueComponent } from './bid-queue/bid-queue.component';
import { NewBidComponent } from './new-bid/new-bid.component';
import { BidOverviewComponent } from './bid-overview/bid-overview.component';
import { BidFileManagerComponent } from './bid-overview/components/bid-file-manager/bid-file-manager.component';

// Route list for the Bids/Opportunities module. Paths for current-bids/bid-queue/new-bid match
// the Phase 1 placeholder stubs 1:1 (app.routes.ts had 'bids/current-bids', 'bids/bid-queue',
// 'bids/new-bid' as PlaceholderComponent entries - replace those three lines with everything
// below).
//
// TWO ROUTES ARE NEW, not in the original stub list - the real Blazor source needs them:
//   - 'bids/bid-overview/:bidId/:type' (Blazor: @page "/Bids/BidOverview/{BidId}/{Type}") -
//     every bid link from CurrentBids/BidQueue navigates here; it wasn't stubbed because Phase 1
//     only knew about the three top-level nav links, not per-bid deep links.
//   - 'bids/documents/:bidId' (Blazor: @page "/Bids/Documents/{BidId}") - the standalone file
//     manager route (BidProjectDetailsTab/BidQueueOverview's "Bid Document Library" links here).
//
// NOT included: a route for RootBidFileManagerComponent.razor's "/BidsDocManagement/Main" -
// see bid-file-manager.component.ts's header comment for why.
export const BIDS_ROUTES: Routes = [
  { path: 'bids/current-bids', component: CurrentBidsComponent, data: { title: 'Bids' } },
  { path: 'bids/bid-queue', component: BidQueueComponent, data: { title: 'Bid Queue' } },
  { path: 'bids/new-bid', component: NewBidComponent, data: { title: 'New Bid' } },
  {
    path: 'bids/bid-overview/:bidId/:type',
    component: BidOverviewComponent,
    data: { title: 'Bid Overview' },
  },
  { path: 'bids/documents/:bidId', component: BidFileManagerComponent, data: { title: 'Bid Documents' } },
];
