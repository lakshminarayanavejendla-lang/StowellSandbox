import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BidService } from '../../../core/services/bid.service';
import { BidRecord } from '../../../core/models/bids/bid-record.model';
import { BidSummaryTabComponent } from './components/bid-summary-tab/bid-summary-tab.component';
import { BidDetailsTabComponent } from './components/bid-details-tab/bid-details-tab.component';
import { BidFileManagerComponent } from './components/bid-file-manager/bid-file-manager.component';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * The bid page with its Overview, Details and Documents tabs, from BidOverview.razor.
 *
 * Its route, 'bids/bid-overview/:bidId/:type' (/Bids/BidOverview/{BidId}/{Type} in Blazor), had no
 * placeholder, but every bid link in Current Bids and the Bid Queue opens it.
 *
 * In Blazor the Overview and Details tabs each loaded the same bid with GetBidById. Here it loads
 * once and is passed to both tabs, then reloads after a save, Won or Lost succeeds. If the separate
 * loads were on purpose, change it back.
 */
@Component({
  selector: 'app-bid-overview',
  standalone: true,
  imports: [PageHeaderComponent, BidSummaryTabComponent, BidDetailsTabComponent, BidFileManagerComponent],
  templateUrl: './bid-overview.component.html',
  styleUrl: './bid-overview.component.scss',
})
export class BidOverviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bidService = inject(BidService);

  bidId = '';
  type = '';

  activeTab: 'overview' | 'details' | 'documents' = 'overview';

  bidRecord: BidRecord | null = null;

  ngOnInit(): void {

    this.bidId = this.route.snapshot.paramMap.get('bidId') ?? '';
    this.type = this.route.snapshot.paramMap.get('type') ?? '';

    console.log('================================');
    console.log('BidOverview initialized');
    console.log('Bid ID:', this.bidId);
    console.log('Type:', this.type);
    console.log('================================');

    this.loadBid();
  }

  switchTab(tab: 'overview' | 'details' | 'documents'): void {
    this.activeTab = tab;
  }

  loadBid(): void {

    if (!this.bidId) {
      console.error('Bid ID is empty');
      return;
    }

    console.log('Calling GetBidById...');
    console.log('DisplayBidID:', this.bidId);

    this.bidService.getBidById(this.bidId).subscribe({

      next: (record: BidRecord | null) => {

        console.log('========== API RESPONSE ==========');
        console.log('record:', record);
        console.log('record is null:', record === null);

        if (record) {
          console.log('DisplayBidID:', record.displayBidID);
          console.log('BidName:', record.bidName);
        }

        console.log('===================================');

        this.bidRecord = record;
        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('========== API ERROR ==========');
        console.error(error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Error:', error.error);
        console.error('================================');

        this.bidRecord = null;
      }

    });
  }
 constructor(
  private cdr: ChangeDetectorRef,
  ) {}
 }
