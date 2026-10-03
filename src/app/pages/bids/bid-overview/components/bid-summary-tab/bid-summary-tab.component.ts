import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { MsalService } from '@azure/msal-angular';
import { BidService } from '../../../../../core/services/bid.service';
import { BidAmountService } from '../../../../../core/services/bid-amount.service';
import { BidNoteService } from '../../../../../core/services/bid-note.service';
import { BidRecord } from '../../../../../core/models/bids/bid-record.model';
import { AddBidAmountRequest, BidAmount, DeleteBidAmountRequest } from '../../../../../core/models/bids/bid-amount.model';
import { AddBidNoteRequest, BidNote } from '../../../../../core/models/bids/bid-note.model';
import { AuthService } from '../../../../../core/services/auth.service';

/**
 * The bid's Overview tab, from BidQueueOverview.razor. Radzen's grid, dropdowns, popup, date picker
 * and number box are replaced with a plain table and a simple popup, like the rest of this module.
 *
 * Probably a bug in Blazor, kept as is: OnInitializedAsync sets _bidStatus to the job phases (RFI,
 * Estimate, Bid, Project) and _phases to the bid statuses (Open Bid, Won, Lost, Pending). So Bid
 * Phase shows status values and Bid Status shows phase values. GetAllBidPhases() and
 * GetAllBidStatus() exist but are commented out. bidPhaseOptions and bidStatusOptions below copy
 * that exactly. Ask the user before changing it.
 */
@Component({
  selector: 'app-bid-summary-tab',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe, CurrencyPipe, GridModule],
  templateUrl: './bid-summary-tab.component.html',
  styleUrl: './bid-summary-tab.component.scss',
})
export class BidSummaryTabComponent implements OnChanges {
  @Input({ required: true }) bidId!: string;
  @Input({ required: true }) type!: string;
  @Input() bidRecord: BidRecord | null = null;
  @Output() bidChanged = new EventEmitter<void>();
  /** Asks the bid page to switch to its Documents tab (the Bid Document Library link). */
  @Output() openDocuments = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private bidService = inject(BidService);
  private bidAmountService = inject(BidAmountService);
  private bidNoteService = inject(BidNoteService);
  private authservice = inject(AuthService);
  private router = inject(Router);

  readonly divisions = ['Orlando', 'Naples', 'Jacksonville', 'Tampa', 'Texas'];
  // These look swapped; see the note at the top.
  readonly bidPhaseOptions = ['Open Bid', 'Won', 'Lost', 'Pending'];
  readonly bidStatusOptions = ['RFI', 'Estimate', 'Bid', 'Project'];
  // State is a dropdown, like everywhere else on the tab, with the same full list of 50 states plus
  // DC as new-bid.component.ts (Mike Smith, 2026-09-16: "its still a textbox").
  readonly states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
    'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
    'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
    'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
    'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  ];

  bidAmounts: BidAmount[] = [];
  showAddAmount = false;
  newBidDate = '';
  newBidAmount: number | null = null;
  isSaving = false;
  // A double-click on Bid Won or Bid Lost used to run convertBidToProject twice. The stored procedure
  // has no locking, so both could create a Sage job (Mike Smith, 2026-09-17: "I was able to create a
  // duplicate project by accident"). This blocks the second click; the procedure's locking is a
  // separate fix.
  isConverting = false;
  isClosingLost = false;
  message = '';

  // The Notes table (see bid-note.model.ts).
  notes: BidNote[] = [];
  newNoteText = '';

  // The Notes "User" column is filled from the signed-in MSAL account, not typed.
  // getActiveAccount() is null unless setActiveAccount() was called after login, which this app never
  // does, so it falls back to getAllAccounts()[0]. That's fine with one account per browser.
  // It uses getLoggedInUserName(), the account's display name, instead of the email (Mike Smith,
  // 2026-09-16: "Can we have user first and last name here instead of email address?"). Only new
  // notes get the name; older rows still hold the email.
  get currentUserName(): string {
    return this.authservice.getLoggedInUserName() ?? this.authservice.getLoggedInUserEmail() ?? 'Unknown User';
  }

  /** Shows names instead of emails for older notes too (Mike Smith, 2026-09-20). Display only;
   * nothing saved changes. The signed-in user's own email shows as their display name, other emails
   * become a name ("john.smith@stowellinc.com" shows as "John Smith"), and anything else shows as is. */
  displayUser(value?: string | null): string {
    if (!value) return '';
    if (!value.includes('@')) return value;

    const me = this.authservice.getLoggedInUserEmail();
    if (me && me.toLowerCase() === value.toLowerCase()) {
      const name = this.authservice.getLoggedInUserName();
      if (name) return name;
    }

    const words = value
      .split('@')[0]
      .split(/[._\-+]+/)
      .map((w) => w.replace(/\d+/g, ''))
      .filter((w) => w.length);
    return words.length ? words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : value;
  }

  // Shown greyed out next to currentUserName in the Notes toolbar, so you can see what will be
  // saved before you click Add.
  readonly today = new Date();

  form = this.fb.nonNullable.group({
    displayBidID: [''],
    bidName: [''],
    division: [''],
    bidPhase: [''],
    bidStatus: [''],
    address1: [''],
    address2: [''],
    city: [''],
    state: [''],
    zipCode: [''],
  });

  get isClosed(): boolean {
    return this.type === 'Closed';
  }

ngOnChanges(changes: SimpleChanges): void {

  console.log('========== CHILD ngOnChanges ==========');
  console.log('changes:', changes);

  if (changes['bidRecord']) {
const displayBidID =
  (changes['bidRecord'].currentValue as BidRecord | null)?.displayBidID;
  console.log('Child received displayBidID:', displayBidID);
    const record = changes['bidRecord'].currentValue as BidRecord | null;

    console.log('Child received bidRecord:', record);

    if (record) {

      console.log('Child DisplayBidID:', record.displayBidID);
      console.log('Child BidName:', record.bidName);

      this.form.patchValue({
        displayBidID: record.displayBidID ?? '',
        bidName: record.bidName ?? '',
        division: record.division ?? '',
        bidPhase: record.bidPhase ?? '',
        bidStatus: record.bidStatus ?? '',
        address1: record.address1 ?? '',
        address2: record.address2 ?? '',
        city: record.city ?? '',
        state: record.state ?? '',
        zipCode: record.zipCode ?? ''
      });
    }
  }

  if (changes['bidId'] && this.bidId) {
    console.log('Loading amounts for:', this.bidId);
    this.loadBidAmounts();
    this.loadNotes();
  }
}

  saveBidData(): void {
    if (!this.bidRecord) {
      return;
    }
    this.isSaving = true;
    this.message = '';
    const value = this.form.getRawValue();

    this.bidService
      .updateBidDetails({
        internalBidID: this.bidRecord.internalBidID,
        address1: value.address1,
        address2: value.address2,
        bidName: value.bidName,
        bidPhase: value.bidPhase,
        bidStatus: value.bidStatus,
        bonded: this.bidRecord.bonded,
        certifiedPayroll: this.bidRecord.certifiedPayroll,
        city: value.city,
        clientName: this.bidRecord.clientName,
        department: this.bidRecord.department,
        division: value.division,
        // This tab has no GC address fields (they're on the Details tab), but it used to send the job
        // site address in them. UpdateBidDetails overwrites everything, so each save here replaced the
        // Client address with the job address (Mike Smith, 2026-09-10). It now sends the loaded
        // bidRecord.gcAddress1 and gcAddress2.
        GC_Address1: this.bidRecord.gcAddress1,
        GC_Address2: this.bidRecord.gcAddress2,
        GC_City: this.bidRecord.gcCity,
        GC_SalesTaxDistrict: this.bidRecord.gcSalesTaxDistrict,
        GC_State: this.bidRecord.gcState,
        // From gcZipCode, not the job ZipCode as in Blazor (see UpdateBidDetailsRequest in bid-record.model.ts).
        GC_ZipCode: this.bidRecord.gcZipCode,
        insuranceType: this.bidRecord.insuranceType,
        invoiceSubmittal: this.bidRecord.invoiceSubmittal,
        jobsite: this.bidRecord.jobsite,
        netTermsDate: this.bidRecord.netTermsDate,
        retainagePercentage: this.bidRecord.retainagePercentage,
        salesTaxDistrict: this.bidRecord.salesTaxDistrict,
        state: value.state,
        taxExempt: this.bidRecord.taxExempt,
        zipCode: value.zipCode,
        // The request had no ModifiedBy, which the API requires, so every save from this tab failed
        // with a 400 (Mike Smith, 2026-09-16: "Bid Phase, Bid Status and Address 2 not saving"). There
        // was no error handler, so isSaving stayed true, Save Bid stayed disabled and nothing was shown.
        modifiedBy: this.authservice.getLoggedInUserEmail() ?? 'System',
      })
      .subscribe({
        next: (success) => {
          this.isSaving = false;
          this.message = success ? 'Bid details saved successfully' : 'Unable to save bid details.';
          if (success) {
            this.bidChanged.emit();
          }
        },
        error: () => {
          this.isSaving = false;
          this.message = 'Unable to save bid details.';
        },
      });
  }

  getBidWon(): void {
    if (!this.bidRecord || this.isConverting) {
      return;
    }
    this.isConverting = true;
    this.bidService
      .convertBidToProject({
        internalBidID: this.bidRecord.internalBidID,
        modifiedBy: this.authservice.getLoggedInUserEmail() ?? undefined,
      })
      .subscribe((res) => {
        if (res.newProjectID) {
          this.message = `${res.newProjectID} created successfully.`;
          setTimeout(() => this.router.navigateByUrl('/bids/bid-queue'), 1500);
        } else {
          this.isConverting = false;
          this.message = `Unable to create project: ${res.message || 'unknown error'}`;
        }
        // Re-render, or the button stays on "Creating Project..." and the message never shows after a failure (2026-09-23).
        this.cdr.detectChanges();
      });
  }

  getBidLost(): void {
    if (!this.bidRecord || this.isClosingLost) {
      return;
    }
    this.isClosingLost = true;
    // See getBidLost in bid-details-tab.component.ts (Mike Smith, 2026-09-24: B2600023 stayed in Current Bids).
    this.bidService.closeBidAsLost({ internalBidID: this.bidRecord.internalBidID, modifiedBy: this.authservice.getLoggedInUserEmail() ?? undefined }).subscribe((res) => {
      if (res === 'Success') {
        this.message = 'Bid marked as Lost and moved to Closed Bids.';
        setTimeout(() => this.router.navigateByUrl('/bids/bid-queue'), 1500);
      } else {
        this.message = res === 'Error' || !res ? 'Unable to mark the bid as Lost - please try again.' : `Unable to mark the bid as Lost: ${res}`;
        this.isClosingLost = false;
      }
      this.cdr.detectChanges();
    });
  }

  openAddAmount(): void {
    console.log('******** ADD BID CLICKED ********');

  this.newBidDate = '';
  this.newBidAmount = null;
  this.showAddAmount = true;
//this.cdr.detectChanges();
  console.log('showAddAmount:', this.showAddAmount);
  }

  closeAddAmount(): void {
    this.showAddAmount = false;
  }

saveNewAmount(): void {
  if (!this.bidRecord) {
    console.error('bidRecord is null');
    return;
  }

  if (!this.newBidDate) {
    this.message = 'Please select a bid date.';
    return;
  }

  if (
    this.newBidAmount === null ||
    this.newBidAmount === undefined
  ) {
    this.message = 'Please enter bid amount.';
    return;
  }

  const request: AddBidAmountRequest = {
    internalBidID: this.bidRecord.internalBidID,
    bidDate: this.newBidDate,
    bidAmount: Number(this.newBidAmount),
    status: this.bidRecord.bidStatus ?? undefined,
    modifiedBy: 'System'
  };

  console.log('Saving bid amount:', request);

  this.bidAmountService.addBidAmount(request).subscribe({

    next: (response) => {

      console.log('Mapped response:', response);
      if (response.newId > 0) {

        console.log(
          'SUCCESS - New Bid Amount ID:',
          response.newId
        );

        // Close popup
        this.showAddAmount = false;

        // Clear popup fields
        this.newBidDate = '';
        this.newBidAmount = null;

        // Clear old message
        this.message = '';

        // Reload grid
        this.loadBidAmounts();

      } else {

        console.error(
          'API returned Success but ID was not found:',
          response
        );

        this.message =
          response.message ||
          'Bid amount could not be saved.';
      }
    },

    error: (error) => {

      console.error(
        'AddBidAmount API error:',
        error
      );

      this.message =
        error?.error?.Message ||
        error?.error?.message ||
        'Unable to save bid amount.';
    }
  });
}

deleteAmount(item: BidAmount): void {

  if (!item || !item.bidAmountID) {
    console.error('Invalid BidAmount:', item);
    return;
  }

  const confirmed = confirm(
    'Are you sure you want to delete this record?'
  );

  if (!confirmed) {
    return;
  }

  const request: DeleteBidAmountRequest = {
    bidAmountID: item.bidAmountID,
    modifiedBy: 'System'
  };

  console.log(
    'Deleting Bid Amount:',
    request
  );

  this.bidAmountService
    .deleteBidAmount(request)
    .subscribe({

      next: (message) => {

        console.log(
          'DeleteBidAmount result:',
          message
        );
        if (
          message &&
          message.toLowerCase() !== 'error'
        ) {

          // Reload grid after successful delete
          this.loadBidAmounts();
 this.cdr.detectChanges();
          this.message =
            message || 'Bid amount deleted successfully.';

        } else {

          this.message =
            'Unable to delete bid amount.';
        }
      },

      error: (error) => {

        console.error(
          'Delete Bid Amount API error:',
          error
        );

        this.message =
          error?.error?.Message ||
          error?.error?.message ||
          'Unable to delete bid amount.';
      }

    });
}

  private loadBidAmounts(): void {
  if (!this.bidId) {
    console.warn('Bid ID is empty');
    return;
  }

  console.log('Loading bid amounts for:', this.bidId);

  this.bidAmountService.getBidAmounts(this.bidId).subscribe({
    next: (amounts: BidAmount[]) => {
      console.log('Bid amounts received:', amounts);

      this.bidAmounts = amounts;
 this.cdr.detectChanges();
      console.log('this.bidAmounts:', this.bidAmounts);
    },

    error: (error) => {
      console.error('GetBidAmounts API Error:', error);
      this.bidAmounts = [];
    }
  });
}

  // The Notes table (see bid-note.model.ts).
  private loadNotes(): void {
    if (!this.bidId) return;

    this.bidNoteService.getBidNotes(this.bidId).subscribe((notes) => {
      this.notes = notes;
      this.cdr.detectChanges();
    });
  }

  addNote(): void {
    if (!this.bidRecord || !this.newNoteText.trim()) return;

    const request: AddBidNoteRequest = {
      internalBidID: this.bidRecord.internalBidID,
      noteDate: new Date().toISOString().slice(0, 10),
      note: this.newNoteText.trim(),
      enteredBy: this.currentUserName,
    };

    this.bidNoteService.addBidNote(request).subscribe((res) => {
      if (res.newId > 0) {
        this.newNoteText = '';
        this.loadNotes();
      } else {
        this.message = res.message || 'Unable to save note.';
      }
      this.cdr.detectChanges();
    });
  }

 constructor(
  private cdr: ChangeDetectorRef,
  ) {}
}
