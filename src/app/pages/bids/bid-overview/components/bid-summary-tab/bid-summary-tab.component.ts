import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
 * Port of BidQueueOverview.razor/BidQueueOverviewTabBase.cs - the "Overview" tab of
 * BidOverview.razor. Radzen's RadzenDataGrid/RadzenDropDown/RadzenButton/Popup/RadzenDatePicker/
 * RadzenNumeric are replaced with a plain table + a simple *ngIf-toggled modal overlay, matching
 * the rest of this module.
 *
 * FLAG - likely bug in the source, ported AS-IS below: BidQueueOverviewTabBase.OnInitializedAsync
 * assigns `_bidStatus = jobPhases` (the list "RFI, Estimate, Bid, Project") and
 * `_phases = bidStatuses` (the list "Open Bid, Won, Lost, Pending") - i.e. the "Bid Phase"
 * dropdown ends up showing status-like values and the "Bid Status" dropdown shows phase-like
 * values. The real GetAllBidPhases()/GetAllBidStatus() service calls exist on IBidService but
 * are commented out in favor of these hardcoded, apparently-swapped lists. Reproduced exactly
 * as observed (bidPhaseOptions/bidStatusOptions below) rather than silently "fixing" it -
 * confirm with the user whether this is intentional before changing it.
 */
@Component({
  selector: 'app-bid-summary-tab',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, DatePipe, CurrencyPipe, GridModule],
  templateUrl: './bid-summary-tab.component.html',
  styleUrl: './bid-summary-tab.component.scss',
})
export class BidSummaryTabComponent implements OnChanges {
  @Input({ required: true }) bidId!: string;
  @Input({ required: true }) type!: string;
  @Input() bidRecord: BidRecord | null = null;
  @Output() bidChanged = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private bidService = inject(BidService);
  private bidAmountService = inject(BidAmountService);
  private bidNoteService = inject(BidNoteService);
  private authservice = inject(AuthService);
  private router = inject(Router);

  readonly divisions = ['Orlando', 'Naples', 'Jacksonville', 'Tampa', 'Texas'];
  // See class-level FLAG comment above re: this apparent swap - ported as observed.
  readonly bidPhaseOptions = ['Open Bid', 'Won', 'Lost', 'Pending'];
  readonly bidStatusOptions = ['RFI', 'Estimate', 'Bid', 'Project'];
  // FIX (2026-09-16, Mike Smith - "its still a textbox") - State was a free-text input here, the
  // only place on the Overview tab still not a dropdown; matches new-bid.component.ts's states
  // list (also expanded from Blazor's NC/SC/FL-only list to the full 50 + DC - see that file's fix
  // comment for why).
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
  // FIX (2026-09-17, Mike Smith - "I was able to create a duplicate project by accident") -
  // Bid Won/Bid Lost had no in-flight guard at all, so a double-click (or a slow response
  // tempting a repeat click) fired convertBidToProject twice concurrently - sp_ConvertBidToProject
  // itself has no locking either, so both requests could read IsProject=0 before either commits,
  // each creating its own real Sage job/InsertActRec row. Backend locking fix is separate
  // (sp_ConvertBidToProject); this stops the double-click at the source.
  isConverting = false;
  isClosingLost = false;
  message = '';

  // NEW - Notes table (see bid-note.model.ts header comment).
  notes: BidNote[] = [];
  newNoteText = '';

  // NEW - Notes table's "User" column, stamped from the signed-in MSAL account rather than
  // typed in. getActiveAccount() returns null unless something has explicitly called
  // setActiveAccount() after login - this app's app.config.ts never does (no
  // MsalBroadcastService/handleRedirectPromise wiring), so it's null in practice. Falling back to
  // getAllAccounts()[0] instead, which is safe for this app's single-account-per-browser usage.
  // FIX (2026-09-16, Mike Smith - "Can we have user first and last name here instead of email
  // address?") - was calling getLoggedInUserEmail() twice (a copy/paste leftover); switched to
  // getLoggedInUserName(), which reads the MSAL account's display name claim instead of its
  // username/email. Only affects notes added from now on - existing rows already stored the email.
  get currentUserName(): string {
    return this.authservice.getLoggedInUserName() ?? this.authservice.getLoggedInUserEmail() ?? 'Unknown User';
  }

  /** FIX (2026-09-20, Mike Smith - "user first and last name here instead of email address", Notes
   * table) - the fix above only covered NEW notes; every note saved before it still carries an email
   * address in enteredBy and was still shown as one. This is display-only (nothing stored is
   * changed): an email is shown as the signed-in user's display name when it is theirs, otherwise as
   * a name built from the address ("john.smith@stowellinc.com" -> "John Smith"). A value that isn't
   * an email is shown as-is. */
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

  // NEW - shown greyed-out next to currentUserName in the Notes toolbar so the user can see
  // what will be stamped before they hit Add.
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
debugger;
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
        // FIX (Mike Smith report, 2026-09-10): this tab's form has no GC_Address1/GC_Address2
        // fields (those live on the Details tab) - this used to send value.address1/value.address2
        // (the job site address) here instead. Since UpdateBidDetails does a full overwrite,
        // saving from this Overview tab was silently clobbering the Client (GC) address with the
        // job address on every save, which is what wiped out whatever was just entered on the
        // Details tab. Preserving the already-loaded bidRecord.gcAddress1/2 instead.
        GC_Address1: this.bidRecord.gcAddress1,
        GC_Address2: this.bidRecord.gcAddress2,
        GC_City: this.bidRecord.gcCity,
        GC_SalesTaxDistrict: this.bidRecord.gcSalesTaxDistrict,
        GC_State: this.bidRecord.gcState,
        // Ported CORRECTLY (from gcZipCode), not replicating the source's apparent copy/paste
        // bug - see bid-record.model.ts's UpdateBidDetailsRequest header comment.
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
        // FIX (2026-09-16, Mike Smith - "Bid Phase, Bid Status and Address 2 not saving") - real
        // root cause, confirmed live: this request never included ModifiedBy at all, which the
        // backend's model binding requires - every save from this Overview tab 400'd immediately.
        // The failure was invisible because updateBidDetails()'s Observable re-throws on error and
        // this subscribe had no error handler, so isSaving just stayed stuck true (Save Bid button
        // permanently disabled) with no message shown - looked exactly like a silent no-op.
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
        // FIX (2026-09-23): re-render, otherwise the button stayed on "Creating Project..." and the
        // message never appeared after a failed conversion.
        this.cdr.detectChanges();
      });
  }

  getBidLost(): void {
    if (!this.bidRecord || this.isClosingLost) {
      return;
    }
    this.isClosingLost = true;
    // FIX (2026-09-24, Mike Smith - B2600023 stayed in Current Bids): see bid-details-tab.component.ts getBidLost.
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
    debugger;
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
debugger;
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
debugger;
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
debugger;
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

  // NEW - Notes table (see bid-note.model.ts header comment).
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
