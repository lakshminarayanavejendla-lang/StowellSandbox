import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { BidService } from '../../../core/services/bid.service';
import { Bid } from '../../../core/models/bids/bid.model';

// Port of BidQueue.razor/BidQueueOverviewTabBase.cs's data loading. Two independent
// search+paging grids (Current Opportunities / Closed Opportunities), matching the source's
// duplicated-but-separate current/closed filter logic. Radzen's grid is now a real Syncfusion
// ejs-grid (search box stays custom/component-driven; paging is Grid's own built-in pager).
@Component({
  selector: 'app-bid-queue',
  standalone: true,
  imports: [RouterLink, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './bid-queue.component.html',
  styleUrl: './bid-queue.component.scss',
})
export class BidQueueComponent implements OnInit {
  private bidService = inject(BidService);
constructor(
  private cdr: ChangeDetectorRef,
  ) {}
  currentBids: Bid[] = [];
  closedBids: Bid[] = [];
  filteredCurrentBids: Bid[] = [];
  filteredClosedBids: Bid[] = [];

  currentSearchTerm = '';
  closedSearchTerm = '';

  // Grid's own built-in pager/page-size dropdown replaces the previous manual
  // pagedCurrentBids/pagedClosedBids slicing + First/Prev/Next/Last button row.
  currentPageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };
  closedPageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.bidService.getBidQueueData().subscribe((data) => {
      this.currentBids = data.currentBids ?? [];
      this.closedBids = data.closedBids ?? [];
      this.applyCurrentFilter();
      this.applyClosedFilter();
this.cdr.detectChanges();
    });
  }

  onCurrentSearchChange(term: string): void {
    this.currentSearchTerm = term;
    this.applyCurrentFilter();
  }

  onClosedSearchChange(term: string): void {
    this.closedSearchTerm = term;
    this.applyClosedFilter();
  }

  private applyCurrentFilter(): void {
    const term = this.currentSearchTerm.trim().toLowerCase();
    this.filteredCurrentBids = !term
      ? this.currentBids
      : this.currentBids.filter((b) =>
          [b.bidId, b.bidName, b.bidder, b.bidManager, b.status].some((f) => f?.toLowerCase().includes(term))
        );
  }

  private applyClosedFilter(): void {
    const term = this.closedSearchTerm.trim().toLowerCase();
    this.filteredClosedBids = !term
      ? this.closedBids
      : this.closedBids.filter((b) =>
          [b.bidId, b.bidName, b.bidder, b.bidManager, b.status].some((f) => f?.toLowerCase().includes(term))
        );
  }
}
