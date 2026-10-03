import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { BidService } from '../../../core/services/bid.service';
import { Bid } from '../../../core/models/bids/bid.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { KpiCardsComponent, KpiItem } from '../../../shared/ui/kpi-cards/kpi-cards.component';

// The Bid Queue's two grids, Current Opportunities and Closed Opportunities, each with its own
// search and paging, as in BidQueue.razor. They're Syncfusion grids with our own search box.
@Component({
  selector: 'app-bid-queue',
  standalone: true,
  imports: [KpiCardsComponent, PageHeaderComponent, RouterLink, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './bid-queue.component.html',
  styleUrl: './bid-queue.component.scss',
})
export class BidQueueComponent implements OnInit {
  /** The summary cards under the page header. */
  get kpis(): KpiItem[] {
    const unassigned = this.currentBids.filter((b) => !b.bidManager?.trim()).length;
    return [
      { label: 'Current bids', value: this.currentBids.length },
      { label: 'Closed bids', value: this.closedBids.length },
      { label: 'Unassigned', value: unassigned, hint: unassigned ? 'current bids without a manager' : 'all assigned', tone: unassigned ? 'warn' : 'default' },
    ];
  }

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

  // The grid's own pager and page-size dropdown, in place of the old manual paging buttons.
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
