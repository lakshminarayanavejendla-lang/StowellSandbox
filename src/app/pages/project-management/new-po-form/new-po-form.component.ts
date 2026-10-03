import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ComboBoxModule } from '@syncfusion/ej2-angular-dropdowns';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { PoRequestService } from '../../../core/services/po-request.service';
import { PoRequestItem, PoBackCharge, PoRequestSubmission } from '../../../core/models/project-management/po-request.model';

export type PoFormMode = 'request' | 'approval';
import { PoAttachmentService } from '../../../core/services/po-attachment.service';
import { PoAttachment } from '../../../core/models/project-management/po-attachment.model';
import { VendorService } from '../../../core/services/vendor.service';
import { VendorOption } from '../../../core/models/project-management/vendor.model';
import { JobCostCodeService } from '../../../core/services/job-cost-code.service';
import { JobCostCodeOption } from '../../../core/models/project-management/job-cost-code.model';
import { AuthService } from '../../../core/services/auth.service';
import { JobPhaseService } from '../../../core/services/job-phase.service';
import { JobPhaseOption } from '../../../core/models/project-management/job-phase.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * The PO Request form at 'project-management/new-po-form', built from the Moqups design (page
 * FORM-PO Request), not ported from Blazor. The old NewPOForm.razor was a static mock with other
 * fields (Building, Floor, Requested Change Reason). This one has Requester, Vendor and PO
 * Description, plus Items Requested and Back Charges panels that each feed a table and the Total PO
 * Amount.
 *
 * The Job dropdown uses ProjectCostCodeService.getAllUserJobs(), like every other job picker here.
 *
 * `mode` from the route data also lets this page show the read-only approval view (Moqups page
 * FORM-PO Request Approval), the same way budget-approval.component.ts handles new and modify. That
 * reuses the fields and line logic instead of copying about 250 lines. The default is 'request',
 * and 'new-po-form' and 'edit-po-form' don't set a mode, so they work as before.
 *
 * 'edit-po-form/:poId' and 'po-request-approval/:poId' both have a :poId. isEditMode used to mean
 * "has a poId", so it now also needs `mode !== 'approval'` (see ngOnInit). Otherwise both
 * loadForEdit() and loadForApproval() would run.
 */
@Component({
  selector: 'app-new-po-form',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, ComboBoxModule],
  templateUrl: './new-po-form.component.html',
  styleUrl: './new-po-form.component.scss',
})
export class NewPoFormComponent implements OnInit {
  private costCodeService = inject(ProjectCostCodeService);
  private poRequestService = inject(PoRequestService);
  private attachmentService = inject(PoAttachmentService);
  private vendorService = inject(VendorService);
  private jobCostCodeService = inject(JobCostCodeService);
  private jobPhaseService = inject(JobPhaseService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  loadedDraftId: number | null = null;

  // For editing a submitted PO (the 'edit-po-form/:poId' route, and getPoById and updatePo in
  // po-request.service.ts). True when the page was opened that way, not through 'new-po-form'.
  isEditMode = false;
  editPoId: string | null = null;

  mode: PoFormMode = 'request';
  approvalStatus = '';
  rejectionReason = '';
  showRejectReason = false;

  // The text for the plain <h2> title. It isn't <app-page-header>, because this page matches its
  // Blazor version on the production site (plain h2 and a dashed line), not the branded header of
  // Angular-only pages like the PO Queue.
  get pageTitle(): string {
    if (this.isEditMode) return `Purchase Order - PO ID: ${this.editPoId}`;
    if (this.mode === 'approval') return 'Purchase Order Request Approval';
    return 'Purchase Order Request';
  }

  recJobNumber = recJobNumber;
  jobs: CostCodeRecord[] = [];
  vendors: VendorOption[] = [];
  vendorFields = { text: 'vendorName', value: 'vendorName' };
  costCodes: JobCostCodeOption[] = [];
  costCodeFields = { text: 'display', value: 'costCode' };
  newItemCostCode: number | null = null;

  // "User must select Project Phase" (Moqups, 2026-09-23). The list is the job's phases, from Sage
  // plus any added in the app (see JobPhaseService). A saved draft or PO keeps its phase in
  // `pendingPhase` until the job's phases load, then it's selected. A job with one phase gets it
  // selected automatically.
  availablePhases: JobPhaseOption[] = [];
  selectedPhase: number | null = null;
  private pendingPhase: number | null = null;

  selectedJobId = '';
  jobName = '';
  requester = '';
  vendor = '';
  poDescription = '';
  dateRequested = new Date().toISOString().slice(0, 10);
  requiredOnSite = '';

  items: PoRequestItem[] = [];
  backCharges: PoBackCharge[] = [];

  newItem: PoRequestItem = { item: '', remainingBudget: 0, itemCost: 0, itemNote: '', costCode: null };
  newBackCharge: PoBackCharge = { vendor: '', percentCharge: null, dollarCharge: 0, reason: '' };
  backChargeEnabled = false;

  statusMessage = '';

  attachments: PoAttachment[] = [];
  uploading = false;
  dragging = false;

  // Old POs showed a Total PO Amount of $0.00, because this only added up items.itemCost and they
  // load with no items (they're older than per-line pcorln tracking). loadedTotalAmount keeps the real
  // total from GetPoById or getForApproval until a line is added or changed. Same fix as
  // totalCoAmount in new-co-form.component.ts.
  loadedTotalAmount: number | null = null;

  get totalPoAmount(): number {
    if (this.items.length === 0 && this.loadedTotalAmount != null) {
      return this.loadedTotalAmount;
    }
    return this.items.reduce((sum, i) => sum + (Number(i.itemCost) || 0), 0);
  }

  // The edit form loaded mostly blank even though GetPoById returned everything. The MSAL
  // interceptor can run these callbacks outside Angular's zone, so detectChanges() doesn't always
  // update the page. Each subscribe body below runs inside ngZone.run() to fix that (same as
  // overview-tab and new-co-form).
  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] as PoFormMode) ?? 'request';
    this.editPoId = this.route.snapshot.paramMap.get('poId');
    this.isEditMode = !!this.editPoId && this.mode !== 'approval';

    this.costCodeService.getAllUserJobs().subscribe((jobs) => {
      this.ngZone.run(() => {
        this.jobs = jobs;
        this.cdr.detectChanges();
        if (this.mode === 'approval') {
          this.loadForApproval();
        } else if (this.isEditMode) {
          this.loadForEdit();
        } else {
          this.maybeLoadDraft();
          // The "+ New PO" link on the Project Overview PO tab passes ?jobId=, so the form opens on
          // that job instead of making you pick it again.
          const jobIdParam = this.route.snapshot.queryParamMap.get('jobId');
          if (jobIdParam && !this.selectedJobId) {
            this.onJobChange(jobIdParam);
          }
        }
      });
    });

    this.vendorService.getVendors().subscribe((vendors) => {
      this.ngZone.run(() => {
        this.vendors = vendors;
        this.cdr.detectChanges();
      });
    });
  }

  // A date input needs "YYYY-MM-DD" or it shows blank. The API sends "MM/DD/YYYY" (CONVERT(..., 101)
  // in PO_GetPoById and the CO versions), so Date Requested and Required OnSite never filled in on
  // edit or approval. Dates already in ISO form, such as drafts, are left as they are.
  private toDateInputValue(value: string | null | undefined): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return '';
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** See `mode` in the header. */
  private loadForApproval(): void {
    if (!this.editPoId) {
      this.statusMessage = 'No PO id provided to approve.';
      return;
    }

    this.poRequestService.getForApproval(this.editPoId).subscribe((detail) => {
      this.ngZone.run(() => {
        if (!detail) {
          this.statusMessage = `Could not load PO ${this.editPoId} for approval.`;
          this.cdr.detectChanges();
          return;
        }

        this.onJobChange(detail.jobId);
        this.jobName = detail.jobName;
        this.requester = detail.requester;
        this.vendor = detail.vendor;
        this.poDescription = detail.poDescription;
        this.dateRequested = this.toDateInputValue(detail.dateRequested) || this.dateRequested;
        this.requiredOnSite = this.toDateInputValue(detail.requiredOnSite);
        this.items = detail.items ?? [];
        this.backCharges = detail.backCharges ?? [];
        this.loadedTotalAmount = detail.totalPoAmount ?? null;
        this.approvalStatus = detail.status;
        this.cdr.detectChanges();
      });
    });
  }

  private maybeLoadDraft(): void {
    const draftIdParam = this.route.snapshot.queryParamMap.get('draftId');
    if (!draftIdParam) return;

    this.poRequestService.getDraft(Number(draftIdParam)).subscribe((draft) => {
      this.ngZone.run(() => {
        if (!draft) return;

        this.loadedDraftId = draft.draftId;
        this.pendingPhase = draft.phaseNumber ?? null;
        this.onJobChange(draft.jobId);
        this.vendor = draft.vendor;
        this.poDescription = draft.poDescription;
        this.requester = draft.requester;
        this.dateRequested = this.toDateInputValue(draft.dateRequested) || this.dateRequested;
        this.requiredOnSite = this.toDateInputValue(draft.requiredOnSite);
        this.items = draft.items ?? [];
        this.statusMessage = `Resumed draft #${draft.draftId}.`;
        this.cdr.detectChanges();
      });
    });
  }

  /** See the isEditMode field. */
  private loadForEdit(): void {
    if (!this.editPoId) return;

    this.poRequestService.getPoById(this.editPoId).subscribe((po) => {
      this.ngZone.run(() => {
        if (!po) {
          this.statusMessage = `Could not load PO ${this.editPoId} for editing.`;
          this.cdr.detectChanges();
          return;
        }

        this.pendingPhase = po.phaseNumber ?? null;
        this.onJobChange(po.jobId);
        this.vendor = po.vendor;
        this.poDescription = po.poDescription;
        this.requester = po.requester;
        this.dateRequested = this.toDateInputValue(po.dateRequested) || this.dateRequested;
        this.requiredOnSite = this.toDateInputValue(po.requiredOnSite);
        this.items = po.items ?? [];
        this.backCharges = po.backCharges ?? [];
        this.loadedTotalAmount = po.totalPoAmount ?? null;
        this.cdr.detectChanges();
      });
    });
  }

  onJobChange(recNum: string): void {
    this.selectedJobId = recNum;
    const match = this.jobs.find((j) => String(j.recNum) === recNum);
    this.jobName = match?.jobNumber ?? '';

    this.attachments = [];
    this.costCodes = [];
    this.newItemCostCode = null;
    this.availablePhases = [];
    this.selectedPhase = null;
    if (!recNum) return;

    this.jobPhaseService.getJobPhases(recNum).subscribe((phases) => {
      this.ngZone.run(() => {
        this.availablePhases = phases;
        const wanted = this.pendingPhase;
        this.pendingPhase = null;
        this.selectedPhase =
          wanted !== null && phases.some((p) => p.phaseNumber === wanted)
            ? wanted
            : phases.length === 1
              ? phases[0].phaseNumber
              : null;
        this.cdr.detectChanges();
      });
    });

    this.attachmentService.list(recNum).subscribe((files) => {
      this.ngZone.run(() => {
        this.attachments = files;
        this.cdr.detectChanges();
      });
    });

    this.jobCostCodeService.getJobCostCodes(recNum).subscribe((codes) => {
      this.ngZone.run(() => {
        this.costCodes = codes.map((c) => ({ ...c, display: `${c.costCode} - ${c.costCodeDescription}` }));
        this.cdr.detectChanges();
      });
    });
  }

  onCostCodeSelected(costCode: number | null): void {
    this.newItemCostCode = costCode;
    const match = this.costCodes.find((c) => c.costCode === costCode);
    if (!match) return;
    this.newItem.item = match.display ?? `${match.costCode} - ${match.costCodeDescription}`;
    this.newItem.remainingBudget = match.remaining;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.uploadFiles(files);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    this.uploadFiles(files);
  }

  private uploadFiles(files: File[]): void {
    if (!files.length) return;

    if (!this.selectedJobId) {
      this.statusMessage = 'Select a Job ID before attaching files.';
      return;
    }

    this.uploading = true;
    this.attachmentService.upload(this.selectedJobId, files).subscribe((uploaded) => {
      this.ngZone.run(() => {
        this.attachments = [...uploaded, ...this.attachments];
        this.uploading = false;
        // The upload used to fail without saying so. Files go to the project's "11-Purchase Orders"
        // folder in the document library, so say so when none of them could be saved there.
        this.statusMessage = uploaded.length
          ? `${uploaded.length} document${uploaded.length > 1 ? 's' : ''} saved to the project's 11-Purchase Orders folder.`
          : "The document could not be saved to the project's 11-Purchase Orders folder. Please try again or contact support.";
        this.cdr.detectChanges();
      });
    });
  }

  removeAttachment(att: PoAttachment): void {
    this.attachmentService.delete(this.selectedJobId, att.storedName).subscribe((deleted) => {
      this.ngZone.run(() => {
        if (deleted) {
          this.attachments = this.attachments.filter((a) => a.storedName !== att.storedName);
          this.cdr.detectChanges();
        }
      });
    });
  }

  attachmentUrl(att: PoAttachment): string {
    return this.attachmentService.downloadUrl(this.selectedJobId, att.storedName);
  }

  addItem(): void {
    if (!this.newItem.item.trim()) return;
    // A negative cost would add money back to the cost code, so it's refused here, and the input has
    // min="0" (Mike Smith, 2026-09-23: "PO items always deduct from the specific cost code budget;
    // user will not be inputting any negative numbers").
    if (Number(this.newItem.itemCost) < 0) {
      this.statusMessage = 'Save failed: item cost cannot be negative.';
      return;
    }
    // A submitted PO only takes money off the budget through each line's cost code (pcorln.cstcde),
    // so an item without one would deduct from nothing.
    if (this.newItemCostCode == null) {
      this.statusMessage = 'Save failed: select a cost code for this item.';
      return;
    }
    this.statusMessage = '';
    // Keep the costCode so it's sent with the submit.
    this.items.push({ ...this.newItem, costCode: this.newItemCostCode });
    this.newItem = { item: '', remainingBudget: 0, itemCost: 0, itemNote: '', costCode: null };
    this.newItemCostCode = null;
  }

  editItem(index: number): void {
    this.newItem = { ...this.items[index] };
    // Use the cost code saved on the item. For items from POs submitted before costCode was saved,
    // match the display text instead.
    const match = this.costCodes.find((c) => c.display === this.newItem.item);
    this.newItemCostCode = this.newItem.costCode ?? match?.costCode ?? null;
    this.items.splice(index, 1);
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
  }

  addBackCharge(): void {
    if (!this.backChargeEnabled) return;
    if (!this.newBackCharge.vendor.trim()) return;
    this.backCharges.push({ ...this.newBackCharge });
    this.newBackCharge = { vendor: '', percentCharge: null, dollarCharge: 0, reason: '' };
  }

  editBackCharge(index: number): void {
    this.newBackCharge = { ...this.backCharges[index] };
    this.backCharges.splice(index, 1);
  }

  removeBackCharge(index: number): void {
    this.backCharges.splice(index, 1);
  }

  private buildPayload(): PoRequestSubmission {
    return {
      jobId: this.selectedJobId,
      jobName: this.jobName,
      requester: this.requester,
      vendor: this.vendor,
      poDescription: this.poDescription,
      dateRequested: this.dateRequested,
      requiredOnSite: this.requiredOnSite,
      totalPoAmount: this.totalPoAmount,
      createdBy: this.authService.getLoggedInUserEmail() ?? 'Unknown User',
      phaseNumber: this.selectedPhase,
      items: this.items,
      backCharges: this.backCharges,
    };
  }

  /** "User must select Project Phase" (Moqups FORM-PO Request). Needed to submit or re-save a real PO,
   * but a draft can be saved without one. Returns true when a phase is picked, otherwise shows why. */
  private hasPhase(failPrefix: string): boolean {
    if (this.selectedPhase !== null) return true;
    this.statusMessage = `${failPrefix}: select a project phase.`;
    this.cdr.detectChanges();
    return false;
  }

  /** Sage's pchord.dscrpt must have at least one character, so a blank PO Description came back as a
   * raw "INSERT conflicted with the CHECK constraint" error on Submit. This checks first and says what to fix. */
  private hasDescription(failPrefix: string): boolean {
    if (this.poDescription.trim()) return true;
    this.statusMessage = `${failPrefix}: enter a PO description.`;
    this.cdr.detectChanges();
    return false;
  }

  savePo(): void {
    this.poRequestService.savePo(this.buildPayload()).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.saved ? 'PO saved.' : `Save failed: ${result.error ?? 'unknown error'}`;
        this.cdr.detectChanges();
      });
    });
  }

  /** Saves in edit mode, in place of savePo() and submitRequest() (see the isEditMode field). */
  saveEdits(): void {
    if (!this.editPoId) return;
    if (!this.hasPhase('Save failed')) return;
    if (!this.hasDescription('Save failed')) return;

    this.poRequestService.updatePo(this.editPoId, this.buildPayload()).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.saved
          ? result.pendingApproval
            ? `Change to PO ${this.editPoId} sent to Accounting for approval (request #${result.requestId}). The PO in Sage stays as it is until it is approved.`
            : `PO ${this.editPoId} updated.`
          : `Save failed: ${result.error ?? 'unknown error'}`;
        this.cdr.detectChanges();
      });
    });
  }

  submitRequest(): void {
    if (!this.hasPhase('Submit failed')) return;
    if (!this.hasDescription('Submit failed')) return;

    this.poRequestService.submitPoRequest(this.buildPayload()).subscribe((result) => {
      this.ngZone.run(() => {
        if (!result.submitted) {
          this.statusMessage = `Submit failed: ${result.error ?? 'unknown error'}`;
          this.cdr.detectChanges();
          return;
        }

        // A submitted PO waits for Accounting approval, and the Sage PO number is given on approval (Mike Smith, 2026-09-26).
        this.statusMessage = `PO request submitted for Accounting approval (request #${result.requestId}).`;
        if (this.loadedDraftId != null) {
          this.poRequestService.deleteDraft(this.loadedDraftId).subscribe();
          this.loadedDraftId = null;
        }
        this.cdr.detectChanges();
      });
    });
  }

  // --- Approval mode actions (only when mode === 'approval') ---

  /** Once Accounting has decided, go back to the queue (the PO is no longer in it). */
  private backToAccountingQueue(): void {
    setTimeout(() => this.router.navigate(['/accounting/po-queue']), 1200);
  }

  openRejectReason(): void {
    this.showRejectReason = true;
  }

  cancelReject(): void {
    this.showRejectReason = false;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.editPoId || !this.rejectionReason.trim()) return;

    this.poRequestService.rejectRequest(this.editPoId, this.rejectionReason).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.succeeded ? 'PO rejected and removed from the queue.' : `Reject failed: ${result.error ?? 'unknown error'}`;
        if (result.succeeded) this.showRejectReason = false;
        this.cdr.detectChanges();
        if (result.succeeded) this.backToAccountingQueue();
      });
    });
  }

  approve(): void {
    if (!this.editPoId) return;

    this.poRequestService.approveRequest(this.editPoId).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.succeeded ? 'PO approved and created in Sage.' : `Approve failed: ${result.error ?? 'unknown error'}`;
        this.cdr.detectChanges();
        if (result.succeeded) this.backToAccountingQueue();
      });
    });
  }
}
