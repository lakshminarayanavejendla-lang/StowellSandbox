import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BidService } from '../../../core/services/bid.service';
import { BidRecord } from '../../../core/models/bids/bid-record.model';
import { BidSummaryTabComponent } from './components/bid-summary-tab/bid-summary-tab.component';
import { BidDetailsTabComponent } from './components/bid-details-tab/bid-details-tab.component';
import { BidFileManagerComponent } from './components/bid-file-manager/bid-file-manager.component';

/**
 * Port of BidOverview.razor/BidOverviewBase.cs - the tab shell over BidQueueOverview.razor
 * ("Overview"), BidProjectDetailsTab.razor ("Details"), and BidFileManagerComponent.razor
 * ("Documents").
 *
 * Route: Blazor's @page "/Bids/BidOverview/{BidId}/{Type}" wasn't in the Phase 1 placeholder
 * stub list (only current-bids/bid-queue/new-bid were) - added as a NEW route
 * 'bids/bid-overview/:bidId/:type' since the source clearly needs it (every bid link from
 * CurrentBids/BidQueue points here). Flagged in the handoff report.
 *
 * Consolidation flag: the Blazor original had BOTH BidQueueOverviewTabBase and
 * BidProjectDetailsTabBase independently call IBidService.GetBidById(BidId) on init (duplicate
 * fetch of the same record). This port fetches the BidRecord once here and passes it down to
 * both tabs as an @Input, re-fetching after a child's save/won/lost action reports success -
 * a deliberate small consolidation. Flagged in case the duplicate independent fetches in the
 * source were actually intentional (e.g. for per-tab staleness/isolation reasons).
 */
@Component({
  selector: 'app-bid-overview',
  standalone: true,
  imports: [BidSummaryTabComponent, BidDetailsTabComponent, BidFileManagerComponent],
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
