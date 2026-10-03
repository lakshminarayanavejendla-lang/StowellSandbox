import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ComboBoxModule } from '@syncfusion/ej2-angular-dropdowns';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { JobPoService } from '../../../core/services/job-po.service';
import { PurchaseOrderRecord } from '../../../core/models/project-management/job-po.model';
import { CoRequestService } from '../../../core/services/co-request.service';
import { CoRequestItem, CoBackCharge, CoRequestSubmission } from '../../../core/models/project-management/co-request.model';

export type CoFormMode = 'request' | 'approval';
import { PoAttachmentService } from '../../../core/services/po-attachment.service';
import { PoAttachment } from '../../../core/models/project-management/po-attachment.model';
import { VendorService } from '../../../core/services/vendor.service';
import { VendorOption } from '../../../core/models/project-management/vendor.model';
import { JobCostCodeService } from '../../../core/services/job-cost-code.service';
import { JobCostCodeOption } from '../../../core/models/project-management/job-cost-code.model';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * The CO Request form, built from the Moqups design (page FORM-CO Request), not ported from Blazor.
 * It's nearly the same as new-po-form.component.ts (see its header). The two differences: a
 * Purchase Order picker that links the CO to one of the job's POs (from JobPoService's
 * purchaseOrders, the same list the "$ PO" tab shows), and "CO Reason" in place of "PO Description".
 *
 * `mode` works as in new-po-form, for the approval view (Moqups page FORM-CO Request Approval).
 * isEditMode also checks `mode !== 'approval'`, so 'edit-co-form/:coId' and 'co-request-approval/:coId'
 * don't both run their loaders.
 */
@Component({
  selector: 'app-new-co-form',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, ComboBoxModule],
  templateUrl: './new-co-form.component.html',
  styleUrl: './new-co-form.component.scss',
})
export class NewCoFormComponent implements OnInit {
  private costCodeService = inject(ProjectCostCodeService);
  private jobPoService = inject(JobPoService);
  private coRequestService = inject(CoRequestService);
  private attachmentService = inject(PoAttachmentService);
  private vendorService = inject(VendorService);
  private jobCostCodeService = inject(JobCostCodeService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  loadedDraftId: number | null = null;

  // For editing a submitted CO (the 'edit-co-form/:coId' route, and getCoById and updateCo in
  // co-request.service.ts). True when the page was opened that way, not through 'new-co-form'.
  isEditMode = false;
  editCoId: string | null = null;

  mode: CoFormMode = 'request';
  approvalStatus = '';
  rejectionReason = '';
  showRejectReason = false;

  recJobNumber = recJobNumber;
  vendors: VendorOption[] = [];
  vendorFields = { text: 'vendorName', value: 'vendorName' };
  costCodes: JobCostCodeOption[] = [];
  costCodeFields = { text: 'display', value: 'costCode' };
  newItemCostCode: number | null = null;
  jobs: CostCodeRecord[] = [];
  purchaseOrders: PurchaseOrderRecord[] = [];

  selectedJobId = '';
  jobName = '';
  selectedPurchaseOrderId = '';
  requester = '';
  vendor = '';
  coReason = '';
  dateRequested = new Date().toISOString().slice(0, 10);
  requiredOnSite = '';

  items: CoRequestItem[] = [];
  backCharges: CoBackCharge[] = [];

  newItem: CoRequestItem = { item: '', remainingBudget: 0, itemCost: 0, itemNote: '' };
  newBackCharge: CoBackCharge = { vendor: '', percentCharge: null, dollarCharge: 0, reason: '' };
  backChargeEnabled = false;

  statusMessage = '';

  attachments: PoAttachment[] = [];
  uploading = false;
  dragging = false;

  // Old COs showed a Total CO Amount of $0.00 even though the CO Queue had the real amount. This only
  // added up the items, and old COs load with none (they're older than per-line sbcgln tracking).
  // loadedTotalAmount keeps the real total from GetCoById or getForApproval. Once a line is added or
  // changed, the sum of the items is used as before. A new CO never has a loadedTotalAmount.
  loadedTotalAmount: number | null = null;

  get totalCoAmount(): number {
    if (this.items.length === 0 && this.loadedTotalAmount != null) {
      return this.loadedTotalAmount;
    }
    return this.items.reduce((sum, i) => sum + (Number(i.itemCost) || 0), 0);
  }

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] as CoFormMode) ?? 'request';
    this.editCoId = this.route.snapshot.paramMap.get('coId');
    this.isEditMode = !!this.editCoId && this.mode !== 'approval';

    // The edit form loaded mostly blank even though GetCoById returned requester, coReason and the
    // rest. The MSAL interceptor can run these callbacks outside Angular's zone, so detectChanges()
    // doesn't always update the page. Each subscribe body below runs inside ngZone.run() to fix that
    // (same as overview-tab).
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

  /** See `mode` in the header. */
  private loadForApproval(): void {
    if (!this.editCoId) {
      this.statusMessage = 'No CO id provided to approve.';
      return;
    }

    this.coRequestService.getForApproval(this.editCoId).subscribe((detail) => {
      this.ngZone.run(() => {
        if (!detail) {
          this.statusMessage = `Could not load CO ${this.editCoId} for approval.`;
          this.cdr.detectChanges();
          return;
        }

        this.onJobChange(detail.jobId);
        this.jobName = detail.jobName;
        this.selectedPurchaseOrderId = detail.purchaseOrderId || '';
        this.requester = detail.requester;
        this.vendor = detail.vendor;
        this.coReason = detail.coReason;
        this.dateRequested = detail.dateRequested;
        this.requiredOnSite = detail.requiredOnSite;
        this.items = detail.items ?? [];
        this.backCharges = detail.backCharges ?? [];
        this.loadedTotalAmount = detail.totalCoAmount ?? null;
        this.approvalStatus = detail.status;
        this.cdr.detectChanges();
      });
    });
  }

  private maybeLoadDraft(): void {
    const draftIdParam = this.route.snapshot.queryParamMap.get('draftId');
    if (!draftIdParam) return;

    this.coRequestService.getDraft(Number(draftIdParam)).subscribe((draft) => {
      this.ngZone.run(() => {
        if (!draft) return;

        this.loadedDraftId = draft.draftId;
        this.onJobChange(draft.jobId);
        this.selectedPurchaseOrderId = draft.purchaseOrderId || '';
        this.vendor = draft.vendor;
        this.coReason = draft.coReason;
        this.requester = draft.requester;
        this.dateRequested = draft.dateRequested || this.dateRequested;
        this.requiredOnSite = draft.requiredOnSite || '';
        this.items = draft.items ?? [];
        this.statusMessage = `Resumed draft #${draft.draftId}.`;
        this.cdr.detectChanges();
      });
    });
  }

  /** See the isEditMode field. */
  private loadForEdit(): void {
    if (!this.editCoId) return;

    this.coRequestService.getCoById(this.editCoId).subscribe((co) => {
      this.ngZone.run(() => {
        if (!co) {
          this.statusMessage = `Could not load CO ${this.editCoId} for editing.`;
          this.cdr.detectChanges();
          return;
        }

        this.onJobChange(co.jobId);
        this.selectedPurchaseOrderId = co.purchaseOrderId || '';
        this.vendor = co.vendor;
        this.coReason = co.coReason;
        this.requester = co.requester;
        this.dateRequested = co.dateRequested || this.dateRequested;
        this.requiredOnSite = co.requiredOnSite || '';
        this.items = co.items ?? [];
        this.backCharges = co.backCharges ?? [];
        this.loadedTotalAmount = co.totalCoAmount ?? null;
        this.cdr.detectChanges();
      });
    });
  }

  onJobChange(recNum: string): void {
    this.selectedJobId = recNum;
    const match = this.jobs.find((j) => String(j.recNum) === recNum);
    this.jobName = match?.jobNumber ?? '';

    this.purchaseOrders = [];
    this.selectedPurchaseOrderId = '';
    this.attachments = [];
    this.costCodes = [];
    this.newItemCostCode = null;
    if (!recNum) return;

    this.jobPoService.getJobPoOverview(Number(recNum)).subscribe((data) => {
      this.ngZone.run(() => {
        this.purchaseOrders = data.purchaseOrders;
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
    this.items.push({ ...this.newItem });
    this.newItem = { item: '', remainingBudget: 0, itemCost: 0, itemNote: '' };
    this.newItemCostCode = null;
  }

  editItem(index: number): void {
    this.newItem = { ...this.items[index] };
    const match = this.costCodes.find((c) => c.display === this.newItem.item);
    this.newItemCostCode = match?.costCode ?? null;
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

  private buildPayload(): CoRequestSubmission {
    return {
      jobId: this.selectedJobId,
      jobName: this.jobName,
      purchaseOrderId: this.selectedPurchaseOrderId,
      requester: this.requester,
      vendor: this.vendor,
      coReason: this.coReason,
      dateRequested: this.dateRequested,
      requiredOnSite: this.requiredOnSite,
      totalCoAmount: this.totalCoAmount,
      createdBy: this.authService.getLoggedInUserEmail() ?? 'Unknown User',
      items: this.items,
      backCharges: this.backCharges,
    };
  }

  saveCo(): void {
    this.coRequestService.saveCo(this.buildPayload()).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.saved ? 'CO saved.' : `Save failed: ${result.error ?? 'unknown error'}`;
        this.cdr.detectChanges();
      });
    });
  }

  /** Saves in edit mode, in place of saveCo() and submitRequest() (see the isEditMode field). */
  saveEdits(): void {
    if (!this.editCoId) return;

    this.coRequestService.updateCo(this.editCoId, this.buildPayload()).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.saved
          ? result.pendingApproval
            ? `Change to CO ${this.editCoId} sent to Accounting for approval (request #${result.requestId}). The change order in Sage stays as it is until it is approved.`
            : `CO ${this.editCoId} updated.`
          : `Save failed: ${result.error ?? 'unknown error'}`;
        this.cdr.detectChanges();
      });
    });
  }

  submitRequest(): void {
    this.coRequestService.submitCoRequest(this.buildPayload()).subscribe((result) => {
      this.ngZone.run(() => {
        if (!result.submitted) {
          this.statusMessage = `Submit failed: ${result.error ?? 'unknown error'}`;
          this.cdr.detectChanges();
          return;
        }

        // A submitted CO waits for Accounting approval, and the Sage CO number is given on approval (Mike Smith, 2026-09-26).
        this.statusMessage = `CO request submitted for Accounting approval (request #${result.requestId}).`;
        if (this.loadedDraftId != null) {
          this.coRequestService.deleteDraft(this.loadedDraftId).subscribe();
          this.loadedDraftId = null;
        }
        this.cdr.detectChanges();
      });
    });
  }

  // --- Approval mode actions (only when mode === 'approval') ---

  /** Once Accounting has decided, go back to the queue. */
  private backToAccountingQueue(): void {
    setTimeout(() => this.router.navigate(['/accounting/co-queue']), 1200);
  }

  openRejectReason(): void {
    this.showRejectReason = true;
  }

  cancelReject(): void {
    this.showRejectReason = false;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.editCoId || !this.rejectionReason.trim()) return;

    this.coRequestService.rejectRequest(this.editCoId, this.rejectionReason).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.succeeded ? 'CO rejected and removed from the queue.' : `Reject failed: ${result.error ?? 'unknown error'}`;
        if (result.succeeded) this.showRejectReason = false;
        this.cdr.detectChanges();
        if (result.succeeded) this.backToAccountingQueue();
      });
    });
  }

  approve(): void {
    if (!this.editCoId) return;

    this.coRequestService.approveRequest(this.editCoId).subscribe((result) => {
      this.ngZone.run(() => {
        this.statusMessage = result.succeeded ? 'CO approved and created in Sage.' : `Approve failed: ${result.error ?? 'unknown error'}`;
        this.cdr.detectChanges();
        if (result.succeeded) this.backToAccountingQueue();
      });
    });
  }
}
