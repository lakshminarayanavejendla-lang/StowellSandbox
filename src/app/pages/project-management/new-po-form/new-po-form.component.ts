import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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

/**
 * NEW page - Stowell PO Module (not a Blazor port; rebuilt from the "Stowell PO Module" Moqups
 * design spec, page FORM-PO Request, to serve the existing 'project-management/new-po-form'
 * route). The Blazor NewPOForm.razor this route used to serve was a static, unbound mock with a
 * different, unrelated field set (Building/Floor/Requested Change Reason) - the mockup this
 * feature is now built from has its own Requester/Vendor/PO Description fields plus an
 * "Items Requested" and "Back Charges" line-item entry panel, each feeding its own table and the
 * Total PO Amount.
 *
 * Job dropdown reuses ProjectCostCodeService.getAllUserJobs() - the same source every other
 * Project Management job picker in this app already uses.
 *
 * NEW - `mode` (client-updated Moqups, page FORM-PO Request Approval): this component now also
 * serves the read-only approval view, driven by route data exactly like
 * accounting/budget-approval.component.ts's 'new'/'modify' mode - that's the established
 * precedent in this codebase for "same fields, different action buttons" duplicate mockup pages,
 * so approval reuses this component's field layout and line-item logic instead of duplicating
 * ~250 lines into a second component. Default mode is 'request', matching every existing route
 * to this component today (neither 'new-po-form' nor 'edit-po-form' pass `data.mode`), so none of
 * the existing request/edit behavior changes.
 *
 * FLAG - interaction with isEditMode: both 'edit-po-form/:poId' and the new
 * 'po-request-approval/:poId' route carry a `:poId` param, and isEditMode was originally derived
 * from that param's mere presence. Approval and edit are mutually exclusive flows (read-only
 * Approve/Reject vs full re-save), so isEditMode's check now also requires `mode !== 'approval'`
 * - see ngOnInit - to avoid both loadForEdit() and loadForApproval() firing for the same route.
 */
@Component({
  selector: 'app-new-po-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ComboBoxModule],
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
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  loadedDraftId: number | null = null;

  // NEW - edit-on-click for an already-submitted PO (see project-management.routes.ts's
  // 'edit-po-form/:poId' route and po-request.service.ts's getPoById/updatePo). isEditMode true
  // means this instance was opened via that route rather than 'new-po-form'.
  isEditMode = false;
  editPoId: string | null = null;

  mode: PoFormMode = 'request';
  approvalStatus = '';
  rejectionReason = '';
  showRejectReason = false;

  // NEW - feeds the plain <h2> title (replacing the old inline @if blocks with a single
  // getter); deliberately NOT <app-page-header> - this page's styling matches its live
  // stowelldashboard.proserv360.tech Blazor counterpart (plain h2 + dashed rule, Bootstrap
  // defaults) rather than the newer branded header used by Angular-only pages like PO Queue.
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

  // NEW (2026-09-23, Moqups FORM-PO Request comment: "User must select Project Phase"). The phase
  // list is the selected job's phases (Sage's, plus any added in the app - see JobPhaseService).
  // A saved draft / existing PO brings its phase along: it's parked in `pendingPhase` until the
  // job's phase list has loaded, then selected. A single-phase job is selected automatically.
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

  // FIX - "Total PO Amount" showing $0.00 for real historical POs, same root cause and fix as
  // new-co-form.component.ts's totalCoAmount (see that file's comment): this getter only ever
  // summed items.itemCost, but historical POs predate this app's per-line pcorln tracking and
  // load with items: [] - loadedTotalAmount preserves the real total from GetPoById/
  // getForApproval until the admin actually adds/edits a line item.
  loadedTotalAmount: number | null = null;

  get totalPoAmount(): number {
    if (this.items.length === 0 && this.loadedTotalAmount != null) {
      return this.loadedTotalAmount;
    }
    return this.items.reduce((sum, i) => sum + (Number(i.itemCost) || 0), 0);
  }

  // FIX - edit form loading with most fields blank despite GetPoById returning full data
  // (same root cause as overview-tab.component.ts's "stuck on Loading" bug and
  // new-co-form.component.ts's identical fix): this app's MSAL interceptor/zone.js interaction
  // means these HTTP callbacks can run outside Angular's zone, so detectChanges() doesn't
  // reliably commit to the DOM. Wrapping every subscribe body below in ngZone.run() forces it
  // back into the zone first.
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
          // NEW - "+ New PO" link from Project Overview's PO tab passes ?jobId= so the form opens
          // pre-scoped to that job instead of making the admin re-pick it from the full jobs list.
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

  // FIX - <input type="date"> requires a "YYYY-MM-DD" value or it silently renders blank. The
  // API returns dates as "MM/DD/YYYY" (PO_GetPoById/CO equivalents use CONVERT(..., 101)), which
  // is why Date Requested/Required OnSite never populated on edit/approval. Safe no-op for
  // already-ISO strings (e.g. drafts), since JS parses "YYYY-MM-DD" natively too.
  private toDateInputValue(value: string | null | undefined): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return '';
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** NEW - see this file's `mode` header comment. */
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

  /** NEW - see this file's isEditMode field comment. */
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
        // The upload used to fail silently. Files go to the project's "11-Purchase Orders" folder in the document
        // library - say so when none of them could be saved there.
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
    // NEW (2026-09-23, Mike Smith - "PO items always deduct from the specific cost code budget;
    // user will not be inputting any negative numbers"): a negative cost would ADD money back to
    // the cost code, so reject it here (the input also has min="0").
    if (Number(this.newItem.itemCost) < 0) {
      this.statusMessage = 'Save failed: item cost cannot be negative.';
      return;
    }
    // A submitted PO only deducts from the budget through each line's cost code (pcorln.cstcde),
    // so an item without one would silently deduct from nothing.
    if (this.newItemCostCode == null) {
      this.statusMessage = 'Save failed: select a cost code for this item.';
      return;
    }
    this.statusMessage = '';
    // FIX - costCode was previously dropped here, so it never reached the submitted payload.
    this.items.push({ ...this.newItem, costCode: this.newItemCostCode });
    this.newItem = { item: '', remainingBudget: 0, itemCost: 0, itemNote: '', costCode: null };
    this.newItemCostCode = null;
  }

  editItem(index: number): void {
    this.newItem = { ...this.items[index] };
    // Prefer the cost code already stored on the item; fall back to matching the display text
    // for items loaded from POs submitted before costCode was persisted.
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

  /** Moqups FORM-PO Request: "User must select Project Phase". Required to submit / re-save a real PO
   * (a draft may still be saved without one). Returns true when a phase is chosen, otherwise shows
   * the reason. */
  private hasPhase(failPrefix: string): boolean {
    if (this.selectedPhase !== null) return true;
    this.statusMessage = `${failPrefix}: select a project phase.`;
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

  /** NEW - see this file's isEditMode field comment. Replaces savePo()/submitRequest() in edit mode. */
  saveEdits(): void {
    if (!this.editPoId) return;
    if (!this.hasPhase('Save failed')) return;

    this.poRequestService.updatePo(this.editPoId, this.buildPayload()).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.saved ? `PO ${this.editPoId} updated.` : `Save failed: ${result.error ?? 'unknown error'}`;
        this.cdr.detectChanges();
      });
    });
  }

  submitRequest(): void {
    if (!this.hasPhase('Submit failed')) return;

    this.poRequestService.submitPoRequest(this.buildPayload()).subscribe((result) => {
      this.ngZone.run(() => {
        if (!result.submitted) {
          this.statusMessage = `Submit failed: ${result.error ?? 'unknown error'}`;
          this.cdr.detectChanges();
          return;
        }

        this.statusMessage = `PO request submitted (${result.poId}).`;
        if (this.loadedDraftId != null) {
          this.poRequestService.deleteDraft(this.loadedDraftId).subscribe();
          this.loadedDraftId = null;
        }
        this.cdr.detectChanges();
      });
    });
  }

  // --- Approval mode actions (mode === 'approval' only) ---

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
        this.statusMessage = result.succeeded ? 'PO request rejected.' : `Reject failed: ${result.error ?? 'unknown error'}`;
        if (result.succeeded) this.showRejectReason = false;
        this.cdr.detectChanges();
      });
    });
  }

  approve(): void {
    if (!this.editPoId) return;

    this.poRequestService.approveRequest(this.editPoId).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.succeeded ? 'PO request approved.' : `Approve failed: ${result.error ?? 'unknown error'}`;
        this.cdr.detectChanges();
      });
    });
  }
}
