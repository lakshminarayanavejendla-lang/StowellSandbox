import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { EstimationService } from '../../../core/services/estimation.service';
import { BidItem } from '../../../core/models/estimation/bid-item.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * The Bid Queue, from BidQueue.razor: three grids (Open, Closed and Pending bids). Each row's Project
 * Number opens Edit Bid for that job.
 *
 * The Blazor page's search box and page-size dropdown were commented out, so it only had the grid's
 * own sorting and filtering, with no paging. This version adds a simple search for each section,
 * using the same fields as BidQueueBase.FilterBidQueues (Address, JobID, BidStatus), like Current
 * Jobs. That's a design choice, not something the old page did; remove it if you want an exact match.
 */
@Component({
  selector: 'app-bid-queue',
  standalone: true,
  imports: [PageHeaderComponent, RouterLink, DatePipe, GridModule],
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

  // Page size for all three grids. The Blazor grids had no paging (AllowPaging="false"), so this is new.
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
