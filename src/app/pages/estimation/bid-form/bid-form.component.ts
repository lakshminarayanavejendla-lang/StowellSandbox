import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstimationService } from '../../../core/services/estimation.service';
import { BidInfoDto } from '../../../core/models/estimation/bid-info.model';
import { ContractorClient } from '../../../core/models/estimation/contractor-client.model';
import { Phase } from '../../../core/models/estimation/phase.model';
import { DivisionOption } from '../../../core/models/estimation/estimation-common.model';

import { AuthService } from '../../../core/services/auth.service';
/**
 * Shared port of AddBid.razor/AddBidBase.cs AND EditBidForm.razor/EditBidFormBase.cs.
 *
 * CONSOLIDATION CALL (flagging per the task's request to document this either way): a
 * line-by-line diff of the two .razor files and their code-behind classes showed they are
 * effectively the SAME form - identical field list, identical popups, identical validation
 * (only Job Phase is Required), identical dropdown data sources and identical
 * insert/delete-row handlers for the three line-item sections. The only real differences are:
 *   1. EditBidForm takes a route `{JobId:int}`, loads the existing bid via GetBidDetails and
 *      reverse-populates every field; AddBid instead calls GetNewBidNumber for a fresh Job ID.
 *   2. EditBidForm's Save button posts to UpdateBid instead of SubmitBid.
 *   3. EditBidForm alone renders a second "Send For Approval" button, enabled only when
 *      Bid Status = "Won" - but it calls the exact same submit handler as "Save Bid", so it is
 *      not a functionally distinct action, just a second, conditionally-visible label/CTA.
 * Given ~95%+ field/logic overlap and that the risk of the two silently drifting apart (e.g. a
 * future bug fix applied to one copy but not the other) seemed worse than the risk of one
 * shared component needing an `isEditMode` branch in a few places, this was built as ONE
 * component parameterized by an optional `jobId` route param, rather than two components or a
 * shared child component. If product requirements diverge further between Add and Edit later,
 * split them then - the two code paths are already clearly isolated below (see `isEditMode`).
 */
@Component({
  selector: 'app-bid-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './bid-form.component.html',
  styleUrl: './bid-form.component.scss',
})
export class BidFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private estimationService = inject(EstimationService);
  private authservice= inject(AuthService);
  isEditMode = false;
  isLoading = false;
  jobId = '';

  // TODO: resolve the signed-in user's email from the MSAL account instead of a hardcoded
  // placeholder once auth is fully wired - same open item as JobService/CurrentJobsComponent.
  // The Blazor source resolved this via GetLoggedUserEmail() (server-side ClaimsPrincipal),
  // which has no HTTP call behind it at all (see EstimationService notes).
  private userEmail = this.authservice.getLoggedInUserEmail();

  readonly jobPhases = ['RFI', 'Estimate', 'Bid', 'Project'];
  readonly bidStatuses = ['Open Bid', 'Won', 'Lost', 'Pending'];
  readonly departments = ['Drywall', 'Concrete'];
  readonly empRoles = ['Sr. PM', 'PM'];
  readonly ddlJobTypes: Record<string, string[]> = {
    Drywall: ['Apartment', 'Condo', 'Medical', 'Residential'],
    Concrete: ['Block', 'Tilt Up', 'Foundation'],
  };
  // Hardcoded GUID-keyed division picklist, verbatim from AddBidBase.cs/EditBidFormBase.cs.
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
    // Codes ("0"/"1"/"2"/"3") match the C# select-option values verbatim - "0" behaves as an
    // unselected placeholder in the source but IS a real value (Convert.ToInt32("0") = 0), not
    // null. Ported as-is rather than "fixed" to a proper null-placeholder; flag if that
    // 0-vs-unselected ambiguity needs resolving with the API team.
    insuranceType: ['0'],
    bonded: ['0'],
    taxExempt: ['0'],
    invoiceSubmittal: ['0'],
    certifiedPayroll: ['0'],
    netTermsDate: [null],
    retainagePercent: [null],
  });

  // Repeating line-item sections. Each row is inserted/deleted via its own immediate API call
  // (InsertBid/InsertPhase/InsertEmployee, DeleteBidAmount/DeletePhase/DeleteEmployee) rather
  // than being submitted as part of the main form - matching SaveBidsClick/SavePhaseClick/
  // SaveEmployeeClick in the source, which post-and-refetch each grid independently of
  // SubmitBidAsync. FormArrays back the grids so add/remove goes through Angular's reactive
  // forms API rather than manual array splicing.
  bidAmounts = this.fb.array<FormGroup>([]);
  phases = this.fb.array<FormGroup>([]);
  employees = this.fb.array<FormGroup>([]);

  // Popup entry forms (the modal "add a row" mini-forms).
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
      .subscribe((clients) => (this.contractClientRecords = clients));
    this.estimationService
      .getAllContractorClients()
      .subscribe((clients) => (this.contractClientDroplist = clients));

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

  private loadForEdit(jobIdNum: number): void {
    this.jobId = String(jobIdNum);
    this.form.get('jobId')?.setValue(this.jobId);
    this.refreshLineItems();

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
        contractDate: bid.contractDate ?? null,
        contractAmount: bid.contractAmount ?? null,
        estStartDate: bid.estStartDate ?? null,
        estCompletionDate: bid.estCompletionDate ?? null,
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
        netTermsDate: bid.projectInfo?.netTermsDate ?? null,
        retainagePercent: bid.projectInfo?.retainagePerc ?? null,
      });
      // patchValue above already set `department`; onDepartmentChange rebuilds the dependent
      // jobTypes list AND resets `jobType` to null as a side effect (mirrors
      // AddBidBase.OnDepartmentChange), so the real saved jobType has to be reapplied after.
      this.onDepartmentChange(this.form.get('department')?.value);
      this.form.get('jobType')?.setValue(bid.jobType ?? null);
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

  if (!phaseNum) {
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
        }
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
        }
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

  // --- Main submit (Save Bid / Send For Approval - both call this, matching the source) ---
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
            // FIX (2026-09-16, Mike Smith - "When I save the Project from the 'Update' screen it
            // navigates back to Bid Queue, need to go back to project") - this page is reached
            // from the Project Overview's Details/Overview tabs "Update" link for an existing
            // project (isEditMode), so saving should return there, not to the Bid Queue (which
            // only makes sense for the non-edit "New Bid" flow).
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
