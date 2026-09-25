import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { EstimationService } from '../../../core/services/estimation.service';
import { BidItem } from '../../../core/models/estimation/bid-item.model';

/**
 * Port of BidQueue.razor / BidQueueBase.cs - three grids (Open/Closed/Pending bids), each
 * row's Project Number linking to EditBidForm for that job.
 *
 * FLAG: the original BidQueue.razor has a search box + page-size dropdown in its markup, but
 * both are entirely commented out (`@* ... *@`) - dead markup, not live in the shipped page.
 * The only live filtering/sorting was Radzen's built-in per-column grid chrome
 * (AllowSorting/AllowFiltering="true", AllowPaging="false" - so no paging at all). Rather than
 * silently reproducing the commented-out search box as if it were live, or dropping search
 * entirely, this port adds ONE lightweight client-side search per section reusing
 * BidQueueBase.FilterBidQueues' exact predicate (Address/JobID/BidStatus) - consistent with
 * the search UX already established for Current Jobs in Phase 1, but this is a UX judgment
 * call, not a faithful port of live source behavior. Flag if you'd rather match the dead
 * source exactly (no search control at all).
 */
@Component({
  selector: 'app-bid-queue',
  standalone: true,
  imports: [RouterLink, DatePipe, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './bid-queue.component.html',
  styleUrl: './bid-queue.component.scss',
})
export class BidQueueComponent implements OnInit {
  private estimationService = inject(EstimationService);

  isLoading = true;

  openBids: BidItem[] = [];
  closedBids: BidItem[] = [];
  pendingBids: BidItem[] = [];

  filteredOpenBids: BidItem[] = [];
  filteredClosedBids: BidItem[] = [];
  filteredPendingBids: BidItem[] = [];

  openSearchTerm = '';
  closedSearchTerm = '';
  pendingSearchTerm = '';

  // Shared page-size config for all three grids - none of these had paging before (the source's
  // AllowPaging="false" - see class comment), so this is new functionality via Grid's built-in
  // pager rather than a straight port of prior behavior.
  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.isLoading = true;
    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending === 0) {
        this.isLoading = false;
        this.cd.detectChanges();
      }
    };

    this.estimationService.getOpenBids().subscribe((bids) => {
      debugger;
      this.openBids = bids;
      this.filteredOpenBids = bids;
      done();
    });
    this.estimationService.getClosedBids().subscribe((bids) => {
      this.closedBids = bids;
      this.filteredClosedBids = bids;
      done();
    });
    this.estimationService.getPendingBids().subscribe((bids) => {
      this.pendingBids = bids;
      this.filteredPendingBids = bids;
      done();
    });
  }

  onOpenSearchChange(term: string): void {
    this.openSearchTerm = term;
    this.filteredOpenBids = this.filterBids(this.openBids, term);
  }

  onClosedSearchChange(term: string): void {
    this.closedSearchTerm = term;
    this.filteredClosedBids = this.filterBids(this.closedBids, term);
  }

  onPendingSearchChange(term: string): void {
    this.pendingSearchTerm = term;
    this.filteredPendingBids = this.filterBids(this.pendingBids, term);
  }

  // Matches BidQueueBase.FilterBidQueues' predicate: Address, JobID, BidStatus.
  private filterBids(bids: BidItem[], term: string): BidItem[] {
    const search = term.trim().toLowerCase();
    if (!search) {
      return bids;
    }
    return bids.filter((b) =>
      [b.Address, b.JobID, b.BidStatus].some((f) => f?.toLowerCase().includes(search))
    );
  }
  constructor(private cd: ChangeDetectorRef) {}
}
