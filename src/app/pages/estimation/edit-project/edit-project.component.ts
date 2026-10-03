import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstimationService } from '../../../core/services/estimation.service';
import { BidInfoDto } from '../../../core/models/estimation/bid-info.model';
import { ContractorClient } from '../../../core/models/estimation/contractor-client.model';
import { Phase } from '../../../core/models/estimation/phase.model';
import { DivisionOption } from '../../../core/models/estimation/estimation-common.model';

import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
/**
 * Edit Project, opened by the Update Project button on Project Overview (Mike Smith, 2026-09-26). It's
 * a copy of BidFormComponent, which stays as it was for New Bid/Project, with these changes:
 *   1. The header says 'Edit Project'.
 *   2. The Bids section and its Add Bid popup are gone.
 *   3. Every saved value loads into the form. Dates are converted to the yyyy-MM-dd a date input
 *      needs, and the Client is set after its list loads. Both used to come up blank, and saving then
 *      wiped the dates.
 *   4. The Add Phase and Add Employee popups close as soon as Save Changes works.
 *   5. There's no Send For Approval button, because project updates don't need approval.
 */
/** Turns 'MM/dd/yyyy' (how the API sends dates), an ISO date or 'yyyy-MM-dd' into 'yyyy-MM-dd' for a date input. */
function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(value);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return iso ? iso[1] : null;
}

@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-project.component.html',
  styleUrl: './edit-project.component.scss',
})
export class EditProjectComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private estimationService = inject(EstimationService);
  private authservice= inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  isEditMode = false;
  isLoading = false;
  jobId = '';

  // TODO: use the signed-in user's email from the MSAL account instead of this placeholder once
  // sign-in is fully wired (same as JobService). Blazor's GetLoggedUserEmail() read it on the server
  // and made no HTTP call (see EstimationService).
  private userEmail = this.authservice.getLoggedInUserEmail();

  readonly jobPhases = ['RFI', 'Estimate', 'Bid', 'Project'];
  readonly bidStatuses = ['Open Bid', 'Won', 'Lost', 'Pending'];
  readonly departments = ['Drywall', 'Concrete'];
  readonly empRoles = ['Sr. PM', 'PM'];
  readonly ddlJobTypes: Record<string, string[]> = {
    Drywall: ['Apartment', 'Condo', 'Medical', 'Residential'],
    Concrete: ['Block', 'Tilt Up', 'Foundation'],
  };
  // The fixed division list, keyed by GUID, copied from AddBidBase.cs and EditBidFormBase.cs.
  readonly divisions: DivisionOption[] = [
    { value: 'BlockConcreteGroupId', text: 'BlockConcrete' },
    { value: 'a539add2-52ab-4545-acb6-5d23c703403f', text: 'Jacksonville' },
    { value: '0a6836b5-aa1f-4c7e-b1e9-77be7b5a85d1', text: 'Naples' },
    { value: '3d76dbfb-27c8-4c95-836e-e5caed001a0b', text: 'Orlando' },
    { value: 'b222364a-0ca8-4415-ac9e-36ba0bfcabe1', text: 'Tampa' },
    { value: '1446eb90-6189-47cf-b242-b6f84f9f1d56', text: 'Texas' },
  ];

  jobTypes: string[] = [];
  phasesCatalog: Phase[] = [];
  contractClientDroplist: ContractorClient[] = []; // General Contractor "Client" dropdown source
  contractClientRecords: ContractorClient[] = []; // Project Resources "Employee" dropdown source (yes, ContractorClient[] - see EstimationService note)

  form: FormGroup = this.fb.group({
    bidder: [{ value: '', disabled: true }],
    jobId: [{ value: '', disabled: true }],
    jobPhase: [null, Validators.required],
    bidStatus: [null],
    division: [null],
    department: [null],
    jobType: [{ value: null, disabled: true }],
    jobName: [''],
    jobShortName: [''],
    contractNumber: [''],
    contractDate: [null],
    contractAmount: [null],
    estStartDate: [null],
    estCompletionDate: [null],
    jobSite: [''],
    jobSiteAddress: [''],
    jobSiteAddress2: [''],
    jobSiteCity: [''],
    jobSiteState: [''],
    jobSiteSalesTaxDistrict: [''],
    clientId: [null],
    clientAddress1: [''],
    clientAddress2: [''],
    clientCity: [''],
    clientState: [''],
    clientZip: [''],
    // The codes "0" to "3" match the C# option values. "0" acts as "not chosen" but is a real value
    // (0), not null. Kept that way; check with the API team if that needs changing.
    insuranceType: ['0'],
    bonded: ['0'],
    taxExempt: ['0'],
    invoiceSubmittal: ['0'],
    certifiedPayroll: ['0'],
    netTermsDate: [null],
    retainagePercent: [null],
  });

  // The row lists. Each row is added or deleted with its own API call (InsertPhase, InsertEmployee,
  // DeletePhase, DeleteEmployee and so on), not with the main form, just like the Blazor page, which
  // saved and reloaded each grid separately. FormArrays hold the rows.
  bidAmounts = this.fb.array<FormGroup>([]);
  phases = this.fb.array<FormGroup>([]);
  employees = this.fb.array<FormGroup>([]);

  // The popup forms for adding a row.
  addBidForm = this.fb.group({
    bidDate: [null],
    bidAmount: [null],
  });
  addPhaseForm = this.fb.group({
    phaseNum: [null],
  });
  addEmployeeForm = this.fb.group({
    empRole: ['Sr. PM'],
    employeeId: [null],
  });

  showBidPopup = false;
  showPhasePopup = false;
  showEmployeePopup = false;

  ngOnInit(): void {
    const jobIdParam = this.route.snapshot.paramMap.get('jobId');
    this.isEditMode = jobIdParam !== null;

    this.form.get('bidder')?.setValue(this.userEmail);

    this.estimationService.getAllPhases().subscribe((phases) => (this.phasesCatalog = phases));
    this.estimationService
      .getAllEmployees()
      .subscribe((clients) => {
        this.contractClientRecords = clients;
        this.cdr.detectChanges();
      });
    this.estimationService
      .getAllContractorClients()
      .subscribe((clients) => {
        this.contractClientDroplist = clients;
        this.cdr.detectChanges(); // the response can arrive outside Angular's zone, so render the options before selecting one
        this.applyClient();
      });

    if (this.isEditMode && jobIdParam) {
      this.loadForEdit(Number(jobIdParam));
    } else {
      this.loadForAdd();
    }
  }

  private loadForAdd(): void {
    this.estimationService.getNewBidNumber().subscribe((newJobId) => {
      this.jobId = newJobId;
      this.form.get('jobId')?.setValue(newJobId);
      this.refreshLineItems();
    });
  }

  /** The saved Client id, set once the client dropdown has its options (whichever loads last). */
  private savedClientId: number | null = null;

  /** True once the project has a contract amount, which is then read-only here (see loadForEdit). */
  contractAmountLocked = false;

  private applyClient(): void {
    if (this.savedClientId == null || !this.contractClientDroplist.length) return;
    this.form.get('clientId')?.setValue(this.savedClientId);
    this.cdr.detectChanges();
  }

  private loadForEdit(jobIdNum: number): void {
    this.jobId = String(jobIdNum);
    this.form.get('jobId')?.setValue(this.jobId);
    this.refreshLineItems();

    // The PM enters the Contract Amount when the project is first submitted. On this edit screen it
    // can't be changed; accounting changes it in Sage 100 (Mike Smith, 2026-09-25). It's disabled, not
    // removed, because submitBid() uses getRawValue(), so the saved amount is sent back unchanged.
    this.form.get('contractAmount')?.disable();

    this.estimationService.getBidDetails(jobIdNum).subscribe((bid) => {
      if (!bid) {
        return;
      }
      this.jobId = bid.jobID ?? this.jobId;
      this.form.patchValue({
        jobId: this.jobId,
        bidder: bid.bidder ?? this.userEmail,
        jobPhase: bid.phase ?? null,
        bidStatus: bid.bidStatus ?? null,
        division: bid.division ?? null,
        department: this.departments.includes(bid.department ?? '') ? bid.department : null,
        jobName: bid.jobName ?? '',
        jobShortName: bid.shortName ?? '',
        contractNumber: bid.contractNumber ?? '',
        contractDate: toIsoDate(bid.contractDate),
        contractAmount: bid.contractAmount ?? null,
        estStartDate: toIsoDate(bid.estStartDate),
        estCompletionDate: toIsoDate(bid.estCompletionDate),
        jobSite: bid.projectLocation?.jobsite ?? '',
        jobSiteAddress: bid.projectLocation?.address ?? '',
        jobSiteAddress2: bid.projectLocation?.address2 ?? '',
        jobSiteCity: bid.projectLocation?.city ?? '',
        jobSiteState: bid.projectLocation?.state ?? '',
        jobSiteSalesTaxDistrict: bid.projectLocation?.salesTaxDistrict ?? '',
        clientId: bid.contractorInfo?.client ? Number(bid.contractorInfo.client) : null,
        clientAddress1: bid.contractorInfo?.address ?? '',
        clientAddress2: bid.contractorInfo?.address2 ?? '',
        clientCity: bid.contractorInfo?.city ?? '',
        clientState: bid.contractorInfo?.state ?? '',
        clientZip: bid.contractorInfo?.zip ?? '',
        insuranceType: bid.projectInfo?.insuranceType?.toString() ?? '0',
        bonded: bid.projectInfo?.bonded?.toString() ?? '0',
        taxExempt: bid.projectInfo?.taxExcempt?.toString() ?? '0',
        invoiceSubmittal: bid.projectInfo?.invoiceSubmittal?.toString() ?? '0',
        certifiedPayroll: bid.projectInfo?.certifiedPayroll?.toString() ?? '0',
        netTermsDate: toIsoDate(bid.projectInfo?.netTermsDate),
        retainagePercent: bid.projectInfo?.retainagePerc ?? null,
      });
      // patchValue already set `department`, but onDepartmentChange rebuilds the job type list and
      // clears `jobType` (like AddBidBase.OnDepartmentChange), so set the saved jobType again after.
      this.onDepartmentChange(this.form.get('department')?.value);
      this.form.get('jobType')?.setValue(bid.jobType ?? null);
      // Once a Contract Amount is set it can't be changed here; accounting changes it in Sage 100, and the
      // API checks this too (Mike Smith, 2026-09-26). A project created without an amount can still get
      // one. Disabled, not removed, so getRawValue() sends the saved amount back unchanged.
      this.contractAmountLocked = (bid.contractAmount ?? 0) > 0;
      if (this.contractAmountLocked) this.form.get('contractAmount')?.disable();

      this.savedClientId = bid.contractorInfo?.client ? Number(bid.contractorInfo.client) : null;
      this.cdr.detectChanges();
      this.applyClient();
    });
  }

  private refreshLineItems(): void {
    this.estimationService.getBidsAmount(this.jobId).subscribe((rows) => {
      this.bidAmounts.clear();
      rows.forEach((r) => this.bidAmounts.push(this.fb.group(r)));
    });
    this.estimationService.getPhases(this.jobId).subscribe((rows) => {
      this.phases.clear();
      rows.forEach((r) => this.phases.push(this.fb.group(r)));
    });
    this.estimationService.getBidEmployees(this.jobId).subscribe((rows) => {
      this.employees.clear();
      rows.forEach((r) => this.employees.push(this.fb.group(r)));
    });
  }

  onDepartmentChange(department: string | null): void {
    this.jobTypes = department && this.ddlJobTypes[department] ? this.ddlJobTypes[department] : [];
    this.form.get('jobType')?.setValue(null);
    if (this.jobTypes.length > 0) {
      this.form.get('jobType')?.enable();
    } else {
      this.form.get('jobType')?.disable();
    }
  }

  onClientChange(clientId: number | null): void {
    if (clientId === null) {
      return;
    }
    this.estimationService.getContractorClientById(String(clientId)).subscribe((client) => {
      this.form.patchValue({
        clientAddress1: client?.address1 ?? '',
        clientAddress2: client?.address2 ?? '',
        clientCity: client?.city ?? '',
        clientState: client?.state ?? '',
        clientZip: client?.zipCode ?? '',
      });
    });
  }

  // --- Bid Amount popup ---
  openAddBidPopup(): void {
    this.addBidForm.reset();
    this.showBidPopup = true;
  }

  closeBidPopup(): void {
    this.showBidPopup = false;
  }

  saveBid(): void {
    const { bidDate, bidAmount } = this.addBidForm.value;
    this.estimationService
      .insertBid({ id: 0, jobId: this.jobId, bidDate, bidAmount1: bidAmount })
      .subscribe((response) => {
        if (response) {
          this.estimationService.getBidsAmount(this.jobId).subscribe((rows) => {
            this.bidAmounts.clear();
            rows.forEach((r) => this.bidAmounts.push(this.fb.group(r)));
          });
          this.closeBidPopup();
        }
      });
  }

  deleteBidAmount(row: FormGroup): void {
    const id = row.value.id;
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }
    this.estimationService.deleteBidAmount(String(id)).subscribe(() => {
      this.estimationService.getBidsAmount(this.jobId).subscribe((rows) => {
        this.bidAmounts.clear();
        rows.forEach((r) => this.bidAmounts.push(this.fb.group(r)));
      });
    });
  }

  // --- Additional Phase popup ---
  openAddPhasePopup(): void {
    this.addPhaseForm.reset();
    this.showPhasePopup = true;
  }

  closePhasePopup(): void {
    this.showPhasePopup = false;
  }

  savePhase(): void {
    const phaseNum = this.addPhaseForm.value.phaseNum;

  // The blank option used to say "None", the same as the real phase 0 "None", so clicking Save Changes
  // with nothing picked seemed to do nothing. It now says "Select phase" and asks you to pick one.
  if (phaseNum === null || phaseNum === undefined || phaseNum === '') {
    alert('Select a phase first.');
    return;
  }

  const phaseName = this.phasesCatalog.find(
    (p) => p.phaseNum === phaseNum
  )?.phaseName;
    this.estimationService
      .insertPhase({ id: 0, jobId: this.jobId, phase: phaseNum, description: phaseName })
      .subscribe((ok) => {
        if (ok) {
          this.estimationService.getPhases(this.jobId).subscribe((rows) => {
            this.phases.clear();
            rows.forEach((r) => this.phases.push(this.fb.group(r)));
          });
          this.closePhasePopup();
        } else {
          alert('Could not add the phase. Please try again.');
        }
        this.cdr.detectChanges();
      });
  }

  deletePhase(row: FormGroup): void {
    const id = row.value.id;
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }
    this.estimationService.deletePhase(String(id)).subscribe(() => {
      this.estimationService.getPhases(this.jobId).subscribe((rows) => {
        this.phases.clear();
        rows.forEach((r) => this.phases.push(this.fb.group(r)));
      });
    });
  }

  // --- Employee popup ---
  openAddEmployeePopup(): void {
    this.addEmployeeForm.reset({ empRole: 'Sr. PM', employeeId: null });
    this.showEmployeePopup = true;
  }

  closeEmployeePopup(): void {
    this.showEmployeePopup = false;
  }

  saveEmployee(): void {
    const { empRole, employeeId } = this.addEmployeeForm.value;
    this.estimationService
      .insertEmployee({ id: 0, jobId: this.jobId, role: empRole, employeeId })
      .subscribe((ok) => {
        if (ok) {
          this.estimationService.getBidEmployees(this.jobId).subscribe((rows) => {
            this.employees.clear();
            rows.forEach((r) => this.employees.push(this.fb.group(r)));
          });
          this.closeEmployeePopup();
        } else {
          alert('Could not add the employee. Please try again.');
        }
        this.cdr.detectChanges();
      });
  }

  deleteEmployee(row: FormGroup): void {
    const id = row.value.id;
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }
    this.estimationService.deleteEmployee(String(id)).subscribe(() => {
      this.estimationService.getBidEmployees(this.jobId).subscribe((rows) => {
        this.employees.clear();
        rows.forEach((r) => this.employees.push(this.fb.group(r)));
      });
    });
  }

  // --- Main submit ---
  submitBid(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const v = this.form.getRawValue();

    const bid: BidInfoDto = {
      jobID: this.jobId,
      bidder: v.bidder,
      phase: v.jobPhase,
      bidStatus: v.bidStatus,
      division: v.division,
      department: v.department,
      jobType: v.jobType,
      jobName: v.jobName,
      shortName: v.jobShortName,
      contractNumber: v.contractNumber,
      contractDate: v.contractDate,
      contractAmount: v.contractAmount,
      estStartDate: v.estStartDate,
      estCompletionDate: v.estCompletionDate,
      projectLocation: {
        jobID: this.jobId,
        jobsite: v.jobSite,
        address: v.jobSiteAddress,
        address2: v.jobSiteAddress2,
        city: v.jobSiteCity,
        state: v.jobSiteState,
        salesTaxDistrict: v.jobSiteSalesTaxDistrict,
      },
      contractorInfo: {
        jobID: this.jobId,
        client: v.clientId?.toString() ?? '',
        address: v.clientAddress1,
        address2: v.clientAddress2,
        city: v.clientCity,
        state: v.clientState,
        zip: v.clientZip,
      },
      projectInfo: {
        jobID: this.jobId,
        insuranceType: Number(v.insuranceType),
        bonded: Number(v.bonded),
        taxExcempt: Number(v.taxExempt),
        invoiceSubmittal: Number(v.invoiceSubmittal),
        certifiedPayroll: Number(v.certifiedPayroll),
        netTermsDate: v.netTermsDate,
        retainagePerc: Number(v.retainagePercent),
      },
    };

    const request$ = this.isEditMode
      ? this.estimationService.updateBid(bid)
      : this.estimationService.submitBid(bid);

    request$.subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response?.success) {
          if (!response.isExist) {
            alert(
              this.isEditMode
                ? 'Project details updated successfully'
                : 'Project details saved successfully'
            );
            // Go back to the project after saving, not the Bid Queue, because this page is opened from
            // the project's "Update" link (Mike Smith, 2026-09-16).
            this.router.navigate(
              this.isEditMode
                ? ['/project-management/project-overview', this.jobId]
                : ['/estimation/bid-queue']
            );
          } else {
            alert(response.message ?? '');
          }
        } else {
          alert(
            this.isEditMode
              ? 'Error while updating project details.'
              : 'Error while saving project details.'
          );
        }
      },
      error: () => {
        this.isLoading = false;
        alert(
          this.isEditMode
            ? 'Error while updating project details.'
            : 'Error while saving project details.'
        );
      },
    });
  }
 
}
