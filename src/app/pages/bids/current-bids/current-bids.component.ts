import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { BidService } from '../../../core/services/bid.service';
import { Bid } from '../../../core/models/bids/bid.model';

// Port of CurrentBids.razor. Radzen's paid RadzenDataGrid is now a real Syncfusion ejs-grid
// (Community license) - search stays a component-driven text box, paging/sorting/filtering use
// Grid's own built-in features.
//
// NOT ported: the "Bids Document Library" link (-> /BidsDocManagement/Main, which
// renders RootBidFileManagerComponent). See bid-file-manager.component.ts's header comment for
// why that sibling component was treated as out of scope for this per-bid Bids module pass.
@Component({
  selector: 'app-current-bids',
  standalone: true,
  imports: [RouterLink, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './current-bids.component.html',
  styleUrl: './current-bids.component.scss',
})
export class CurrentBidsComponent implements OnInit {
  private bidService = inject(BidService);

  bids: Bid[] = [];
  filteredBids: Bid[] = [];
  searchTerm = '';
  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.bidService.getCurrentBids().subscribe((bids) => {
      debugger;
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
        debugger;
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredBids = !term
      ? this.bids
      : this.bids.filter((b) =>
          [b.bidId, b.bidName, b.bidder, b.bidManager, b.status].some((f) => f?.toLowerCase().includes(term))
        );
        this.cdr.detectChanges();
  }
}
