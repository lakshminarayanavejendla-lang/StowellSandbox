import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject,ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { BidService } from '../../../../../core/services/bid.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { BidAccessService } from '../../../../../core/services/bid-access.service';
import { BidRecord, UpdateBidDetailsRequest } from '../../../../../core/models/bids/bid-record.model';
import { AddBidAccessRequest, BidAccessSummary, RemoveBidAccessRequest } from '../../../../../core/models/bids/bid-access.model';
import { Employee } from '../../../../../core/models/bids/employee.model';
import { ContractorClient } from '../../../../../core/models/bids/contractor-client.model';

/**
 * Port of BidProjectDetailsTab.razor/BidProjectDetailsTabBase.cs - the "Details" tab of
 * BidOverview.razor.
 *
 * The "Client" (General Contractor) dropdown is populated via BidService.getAllContractorClients()
 * (a duplicated cross-module call into what's really the Estimation module's
 * GetAllContractorClients route - see bids-endpoints.ts's comment on GetAllContractorClientsUrl
 * and contractor-client.model.ts). Selecting a client fills the read-only GC address fields via
 * BidService.getContractorClientByName, same as BidProjectDetailsTabBase.OnClientChange.
 */
@Component({
  selector: 'app-bid-details-tab',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, GridModule],
  templateUrl: './bid-details-tab.component.html',
  styleUrl: './bid-details-tab.component.scss',
})
export class BidDetailsTabComponent implements OnChanges {
  @Input({ required: true }) bidId!: string;
  @Input({ required: true }) type!: string;
  @Input() bidRecord: BidRecord | null = null;
  @Output() bidChanged = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private bidService = inject(BidService);
  private authService = inject(AuthService);
  private bidAccessService = inject(BidAccessService);
  private router = inject(Router);

  bidAccessSummary: BidAccessSummary[] = [];
  employees: Employee[] = [];
  contractorClients: ContractorClient[] = [];
  showAddAccess = false;
  selectedRoleName = '';
  selectedEmployeeName = '';
  message = '';
  isSaving = false;
  isConverting = false;
  isClosingLost = false;

  readonly roles = ['Bid Manager', 'Estimator'];

  form = this.fb.nonNullable.group({
    jobsite: [''],
    address1: [''],
    address2: [''],
    city: [''],
    state: [''],
    salesTaxDistrict: [''],
    clientName: [''],
    GC_Address1: [''],
    GC_Address2: [''],
    GC_City: [''],
    GC_State: [''],
    GC_ZipCode:[''],
    GC_SalesTaxDistrict: [''],
    insuranceType: [''],
    bonded: [''],
    taxExempt: [''],
    invoiceSubmittal: [''],
    certifiedPayroll: [''],
    netTermsDate: [''],
    retainagePercentage: [0],
  });

  get isClosed(): boolean {
    return this.type === 'Closed';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bidId'] && this.bidId) {
      this.bidService.getBidAccessEmployees().subscribe((emps) => (this.employees = emps));
      this.bidService.getAllContractorClients().subscribe((clients) => (this.contractorClients = clients));
      this.loadBidAccess();
    }
    if (changes['bidRecord'] && this.bidRecord) {
      this.form.patchValue({
        jobsite: this.bidRecord.jobsite ?? '',
        address1: this.bidRecord.address1 ?? '',
        address2: this.bidRecord.address2 ?? '',
        city: this.bidRecord.city ?? '',
        state: this.bidRecord.state ?? '',
        salesTaxDistrict: this.bidRecord.salesTaxDistrict ?? '',
        clientName: this.bidRecord.clientName ?? '',
        GC_Address1: this.bidRecord.gcAddress1 ?? '',
        GC_Address2: this.bidRecord.gcAddress2 ?? '',
        GC_City: this.bidRecord.gcCity ?? '',
        GC_State: this.bidRecord.gcState ?? '',
        // FIX (2026-09-24): GC zip was never loaded into the form, so any re-save blanked it.
        GC_ZipCode: this.bidRecord.gcZipCode ?? '',
        GC_SalesTaxDistrict: this.bidRecord.gcSalesTaxDistrict ?? '',
        insuranceType: this.bidRecord.insuranceType ?? '',
        bonded: this.bidRecord.bonded ?? '',
        taxExempt: this.bidRecord.taxExempt ?? '',
        invoiceSubmittal: this.bidRecord.invoiceSubmittal ?? '',
        certifiedPayroll: this.bidRecord.certifiedPayroll ?? '',
        netTermsDate: this.bidRecord.netTermsDate ?? '',
        retainagePercentage: this.bidRecord.retainagePercentage ?? 0,
      });
    }
  }

onClientChange(name: string): void {
  if (!name) {
    return;
  }

  this.bidService.getContractorClientByName(name).subscribe((client) => {
    debugger;

    if (client && this.bidRecord) {

      // Update form
      this.form.patchValue({
        GC_Address1: client.address1 ?? '',
        GC_Address2: client.address2 ?? '',
        GC_City: client.city ?? '',
        GC_State: client.state ?? '',
        // FIX (2026-09-17) - GC_ZipCode was never patched here, so selecting a Client left
        // whatever zip was already in the field (usually blank/stale).
        GC_ZipCode: client.zipCode ?? ''
      });

      // Update bidRecord
      this.bidRecord.gcAddress1 = client.address1 ?? '';
      this.bidRecord.gcAddress2 = client.address2 ?? '';
      this.bidRecord.gcCity = client.city ?? '';
      this.bidRecord.gcState = client.state ?? '';
      this.bidRecord.gcZipCode = client.zipCode ?? '';

      // Update client name
      this.bidRecord.clientName = name;
    }
  });
}

saveBidData(): void {
  if (!this.bidRecord) {
    console.error('bidRecord is null');
    return;
  }

  this.isSaving = true;
  this.message = '';
debugger;
  const value = this.form.getRawValue();
console.log("Final values:",value);
const request: UpdateBidDetailsRequest = {
  internalBidID: this.bidRecord.internalBidID,

  department: this.bidRecord.department,
  division: this.bidRecord.division,
  bidName: this.bidRecord.bidName,
  bidPhase: this.bidRecord.bidPhase,
  bidStatus: this.bidRecord.bidStatus,

  jobsite: value.jobsite,
  address1: value.address1,
  address2: value.address2,
  city: value.city,
  state: value.state,
  zipCode: this.bidRecord.zipCode,
  salesTaxDistrict: value.salesTaxDistrict,

  clientName: value.clientName,

  // IMPORTANT: match your existing interface
  GC_Address1: value.GC_Address1,
  GC_Address2: value.GC_Address2,
  GC_City: value.GC_City,
  GC_State: value.GC_State,
  GC_ZipCode: value.GC_ZipCode,
  GC_SalesTaxDistrict: value.GC_SalesTaxDistrict,

  insuranceType: value.insuranceType,
  bonded: value.bonded,
  taxExempt: value.taxExempt,
  invoiceSubmittal: value.invoiceSubmittal,
  certifiedPayroll: value.certifiedPayroll,

  // FIX (2026-09-17, Mike Smith - "Net Terms date [not saving]") - was
  // this.bidRecord.netTermsDate, the STALE value from when the record was first loaded, not the
  // form control's current value - so any edit the user made here was silently discarded on
  // save, every time, regardless of what they typed.
  netTermsDate: value.netTermsDate || undefined,

  retainagePercentage: value.retainagePercentage ?? 0,

  modifiedBy: 'System'
};

  console.log('========== UPDATE BID DETAILS ==========');
  console.log('Request:', request);
   console.log('BidRecord:', this.bidRecord);

  this.bidService.updateBidDetails(request).subscribe({
    next: (success) => {

      console.log('Update response:', success);

      this.isSaving = false;

      if (success) {
        this.message = 'Bid details saved successfully';

        // Tell parent component that bid was updated
        this.bidChanged.emit();

      } else {
        this.message = 'Unable to save bid details.';
      }
    },

    error: (error) => {

      this.isSaving = false;

      console.error('========== UPDATE BID ERROR ==========');
      console.error('Status:', error?.status);
      console.error('Error:', error);
      console.error('API error:', error?.error);

      this.message =
        error?.error?.message ||
        error?.error?.Message ||
        'Unable to save bid details.';
    }
  });
}

  // FIX (2026-09-17, Mike Smith - "I was able to create a duplicate project by accident") -
  // same fix as bid-summary-tab.component.ts's getBidWon/getBidLost (see that file's comment) -
  // this tab has its own separate copy of these buttons/handlers, so it needed its own guard too.
  getBidWon(): void {
    if (!this.bidRecord || this.isConverting) {
      return;
    }

    this.isConverting = true;
    // FIX (2026-09-23): modifiedBy was being sent the bid's modifiedDate; use the signed-in user
    // (same as bid-summary-tab.component.ts) so BidLog records who converted it.
    this.bidService.convertBidToProject({ internalBidID: this.bidRecord.internalBidID, modifiedBy: this.authService.getLoggedInUserEmail() ?? undefined }).subscribe((res) => {
      if (res.newProjectID) {
        this.message = `${res.newProjectID} created successfully.`;
        setTimeout(() => this.router.navigateByUrl('/bids/bid-queue'), 1500);
      } else {
        this.isConverting = false;
        this.message = `Unable to create project: ${res.message || 'unknown error'}`;
      }
      // FIX (2026-09-23): re-render, otherwise the button stayed on "Creating Project..." forever
      // after a failed conversion and the reason never showed.
      this.cdr.detectChanges();
    });
  }

  getBidLost(): void {
    if (!this.bidRecord || this.isClosingLost) {
      return;
    }
    this.isClosingLost = true;
    // FIX (2026-09-24, Mike Smith - B2600023 "clicked Lost and it stayed in the Current Bids queue"): the request
    // went without modifiedBy, the API answered 400, and the failed call was treated as success (the service
    // returns 'Error', which is truthy) - so the page went back to the queue with the bid untouched. Send the
    // signed-in user, and only leave the page when the API really answered "Success".
    this.bidService.closeBidAsLost({ internalBidID: this.bidRecord.internalBidID, modifiedBy: this.authService.getLoggedInUserEmail() ?? undefined }).subscribe((res) => {
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

openAddAccess(): void {
  console.log('========== ADD ACCESS CLICKED ==========');

  this.selectedRoleName = '';
  this.selectedEmployeeName = '';

  this.showAddAccess = true;

  console.log('showAddAccess:', this.showAddAccess);
}

  closeAddAccess(): void {
    this.showAddAccess = false;
  }

saveAccess(): void {

  console.log('========== SAVE ACCESS ==========');

  if (!this.bidRecord) {
    console.error('bidRecord is null');
    return;
  }

  if (!this.selectedRoleName) {
    this.message = 'Please select a role.';
    return;
  }

  if (!this.selectedEmployeeName) {
    this.message = 'Please select an employee.';
    return;
  }

  const request: AddBidAccessRequest = {
    internalBidID: this.bidRecord.internalBidID,
    roleName: this.selectedRoleName,
    employeeName: this.selectedEmployeeName,
    modifiedBy: 'System'
  };

  console.log('Request being sent:', request);

  this.bidAccessService.addBidAccess(request).subscribe({

    next: (response) => {

      console.log('========== ADD ACCESS RESPONSE ==========');
      console.log(response);

      if (response.newId > 0) {

        console.log(
          'Bid Access saved successfully. ID:',
          response.newId
        );

        // 1. Close popup immediately
        this.showAddAccess = false;

        // 2. Clear popup values
        this.selectedRoleName = '';
        this.selectedEmployeeName = '';

        // 3. Clear message
        this.message = '';

        // 4. Reload grid
        this.loadBidAccess();

      } else {

        console.error(
          'AddBidAccess did not return a valid ID:',
          response
        );

        this.message =
          response.message || 'Unable to add bid access.';
      }
    },

    error: (error) => {

      console.error(
        'AddBidAccess HTTP error:',
        error
      );

      this.message =
        error?.error?.message ??
        error?.error?.Message ??
        'Unable to add bid access.';
    }

  });
}

deleteAccess(item: BidAccessSummary): void {

  console.log('========== DELETE ACCESS ==========');
  console.log('Selected item:', item);

  if (!confirm('Are you sure you want to delete this record?')) {
    return;
  }

  if (!item.bidAccessID) {
    console.error('BidAccessID is missing:', item);
    this.message = 'Unable to delete: Bid Access ID is missing.';
    return;
  }

  const request: RemoveBidAccessRequest = {
    bidAccessID: item.bidAccessID,
    modifiedBy: 'System'
  };

  console.log('Delete request:', request);

  this.bidAccessService
    .removeBidAccess(request)
    .subscribe({

      next: (response) => {

        console.log(
          'RemoveBidAccess response:',
          response
        );

        if (response !== 'Error') {

          // Reload grid after successful delete
          this.loadBidAccess();

          this.message =
            response || 'Bid access removed successfully.';

        } else {

          this.message =
            'Unable to remove bid access.';
        }
      },

      error: (error) => {

        console.error(
          'RemoveBidAccess error:',
          error
        );

        this.message =
          error?.error?.message ??
          error?.error?.Message ??
          'Unable to remove bid access.';
      }

    });
}

  private loadBidAccess(): void {
   this.bidAccessService.getBidAccessSummary(this.bidId).subscribe((rows) => {
    this.bidAccessSummary = rows;

    this.cdr.detectChanges();
  });
   
  }
  constructor(private cdr: ChangeDetectorRef) {
}
}
