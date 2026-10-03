import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { BidService } from '../../../core/services/bid.service';
import { Bid } from '../../../core/models/bids/bid.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { KpiCardsComponent, KpiItem } from '../../../shared/ui/kpi-cards/kpi-cards.component';

// Current Bids, from CurrentBids.razor, using a Syncfusion grid with its own paging, sorting and
// filtering. The search box is our own.
//
// The "Bids Document Library" link (/BidsDocManagement/Main) isn't ported, because
// RootBidFileManagerComponent isn't either.
@Component({
  selector: 'app-current-bids',
  standalone: true,
  imports: [KpiCardsComponent, PageHeaderComponent, RouterLink, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './current-bids.component.html',
  styleUrl: './current-bids.component.scss',
})
export class CurrentBidsComponent implements OnInit {
  /** The summary cards under the page header. */
  get kpis(): KpiItem[] {
    const unassigned = this.bids.filter((b) => !b.bidManager?.trim()).length;
    return [
      { label: 'Current bids', value: this.bids.length, hint: 'in the queue' },
      { label: 'Assigned to a manager', value: this.bids.length - unassigned, tone: 'good' },
      { label: 'Unassigned', value: unassigned, hint: unassigned ? 'need a bid manager' : 'all assigned', tone: unassigned ? 'warn' : 'default' },
      { label: 'Showing', value: this.filteredBids.length, hint: this.searchTerm ? 'matching your search' : 'all bids' },
    ];
  }

  private bidService = inject(BidService);

  bids: Bid[] = [];
  filteredBids: Bid[] = [];
  searchTerm = '';
  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.bidService.getCurrentBids().subscribe((bids) => {
      this.bids = bids;
      this.applyFilter();
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }
constructor(
  private cdr: ChangeDetectorRef,
  ) {}
  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredBids = !term
      ? this.bids
      : this.bids.filter((b) =>
          [b.bidId, b.bidName, b.bidder, b.bidManager, b.status].some((f) => f?.toLowerCase().includes(term))
        );
        this.cdr.detectChanges();
  }
}
