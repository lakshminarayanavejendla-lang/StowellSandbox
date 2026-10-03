import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, PageService, SortService } from '@syncfusion/ej2-angular-grids';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { JobPoService } from '../../../../../core/services/job-po.service';
import { PoRequestService } from '../../../../../core/services/po-request.service';
import { BidInfoDto } from '../../../../../core/models/project-management/bid-info.model';
import { PurchaseOrderRecord, BackChargeLogRecord } from '../../../../../core/models/project-management/job-po.model';
import { CurrentCostSummaryViewModel, Phase } from '../../../../../core/models/project-management/cost-summary.model';
import { PoDraftSummary } from '../../../../../core/models/project-management/po-draft.model';

/**
 * The Purchase Orders tab, built from the Moqups design (page "TAB-Purchase Orders", checked against
 * the live mockup).
 *
 * It was rebuilt twice after "PO Tab - does not match Moqup" (Mike Smith, 2026-09-10). The mockup
 * has three toggles (Show Draft POs, Show Active POs, Show Archived POs, all on by default) and three
 * sections: Draft Purchase Order Queue (with New PO and Duplicate PO), Active Purchase Order Queue
 * and Archived Purchase Order Queue. The Change Orders tab has the same layout (see co-tab.component.ts).
 *
 * Where each section's data comes from:
 *   - Draft: PoRequestService.getDrafts(), as on the PO Queue page, filtered to this job because
 *     there's no per-job draft call. The draft list has no requiredOnSite, so that column is blank
 *     rather than loading each draft.
 *   - Active: purchaseOrders from JobPoService.getJobPoOverview() with status 'Open'.
 *   - Archived: the same list, everything not 'Open'. The server has no real "Archived" status yet
 *     (every PO in testing came back Open), so this is the closest match for now.
 *
 * Not built yet:
 *   - The row checkboxes the mockup shows. Their only use is Duplicate PO on a draft, which stays
 *     disabled because there's no API to copy a PO.
 *   - A "Job Phase" header field, because there's no such field in the data.
 *
 * The Change Order Log is on its own Change Orders tab. The Back Charge Log has no tab in the mockup,
 * so it stays here under the PO sections.
 *
 * The Job Id, Job Name and Project Folder Library header uses ProjectOverviewService.getBidDetails(),
 * like the other tabs.
 */
@Component({
  selector: 'app-po-tab',
  standalone: true,
  imports: [GridModule, RouterLink, FormsModule, CurrencyPipe],
  providers: [PageService, SortService],
  templateUrl: './po-tab.component.html',
  styleUrl: './po-tab.component.scss',
})
export class PoTabComponent implements OnChanges {
  @Input({ required: true }) projectId!: number;

  private overviewService = inject(ProjectOverviewService);
  private jobPoService = inject(JobPoService);
  private poRequestService = inject(PoRequestService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  bidModel?: BidInfoDto;
  costSummary?: CurrentCostSummaryViewModel;

  activePurchaseOrders: PurchaseOrderRecord[] = [];
  archivedPurchaseOrders: PurchaseOrderRecord[] = [];
  poDrafts: PoDraftSummary[] = [];
  backChargeLog: BackChargeLogRecord[] = [];

  // An EJ2 grid created with no data and given data later through [dataSource] gets stuck: it stays
  // aria-busy and shows no rows, even after refresh() or dataBind() (found in testing, 2026-09-10).
  // So each <ejs-grid> is only created once its data has arrived (@if in the template).
  poOverviewLoaded = false;
  draftsLoaded = false;

  // The mockup has all three toggles on by default.
  showDraftPOs = true;
  showActivePOs = true;
  showArchivedPOs = true;

  // See overview-tab.component.ts for the same ProjectFolderLibrary setting.
  projectFolderLibraryUrl = '';

  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnChanges(): void {
    if (!this.projectId) return;

    this.overviewService.getBidDetails(this.projectId).subscribe((b) => {
      this.bidModel = b;
      this.cdr.detectChanges();
    });

    this.selectedPhaseId = '';
    this.loadCostSummary();

    this.poOverviewLoaded = false;
    this.jobPoService.getJobPoOverview(this.projectId).subscribe((data) => {
      this.allPurchaseOrders = data.purchaseOrders ?? [];
      this.backChargeLog = data.backChargeLog ?? [];
      this.applyPhaseToPurchaseOrders();
    });

    this.draftsLoaded = false;
    this.poRequestService.getDrafts().subscribe((drafts) => {
      this.allPoDrafts = drafts.filter((d) => d.jobId === String(this.projectId));
      this.applyPhaseToDrafts();
    });
  }

  // Drafts keep the phase they were saved under (dbo.PoRequestDrafts.PhaseNumber, set on the New PO
  // form). With a phase picked, only that phase's drafts show. A draft with no phase only shows under
  // "All phases".
  private allPoDrafts: PoDraftSummary[] = [];

  private applyPhaseToDrafts(): void {
    this.draftsLoaded = false;
    this.cdr.detectChanges();
    const phase = this.phaseFilterActive ? Number(this.selectedPhaseId) : null;
    this.poDrafts = phase === null ? this.allPoDrafts : this.allPoDrafts.filter((d) => d.phaseNumber === phase);
    this.draftsLoaded = true;
    this.cdr.detectChanges();
  }

  // The phase list is taken from the first all-phases load, so it doesn't shrink when one phase is
  // picked (Mike Smith, 2026-09-23).
  phases: Phase[] = [];
  selectedPhaseId = '';

  /** Phase figures and filters only apply when the job has more than one phase. With a single phase,
   * the amounts mustn't change when it's picked, because that phase is the whole job (Mike Smith, 2026-09-23). */
  private get phaseFilterActive(): boolean {
    return this.selectedPhaseId !== '' && this.phases.length > 1;
  }

  private loadCostSummary(): void {
    this.overviewService
      .getCurrentCostSummaryViewModel(String(this.projectId), this.phaseFilterActive ? this.selectedPhaseId : '')
      .subscribe((m) => {
        this.costSummary = m;
        if (!this.phaseFilterActive) this.phases = m.phases ?? [];
        this.cdr.detectChanges();
      });
  }

  // "Show only Active/Archived/Drafts for this project and Phase" (Warren Hampton, Moqups). Active and
  // archived POs have their Sage phase (pchord.phsnum, as poPhase), so they filter by the picked phase.
  // Drafts filter by the phase saved on the draft (see below).
  private allPurchaseOrders: PurchaseOrderRecord[] = [];

  private applyPhaseToPurchaseOrders(): void {
    // Rebuild the grids (loaded = false, render, loaded = true); see the EJ2 note above.
    this.poOverviewLoaded = false;
    this.cdr.detectChanges();
    const phase = this.phaseFilterActive ? Number(this.selectedPhaseId) : null;
    const all = phase === null ? this.allPurchaseOrders : this.allPurchaseOrders.filter((p) => p.poPhase === phase);
    this.activePurchaseOrders = all.filter((p) => (p.status ?? '').toLowerCase() === 'open');
    this.archivedPurchaseOrders = all.filter((p) => (p.status ?? '').toLowerCase() !== 'open');
    this.poOverviewLoaded = true;
    this.cdr.detectChanges();
  }

  onPhaseChange(phaseId: string): void {
    this.selectedPhaseId = phaseId;
    this.loadCostSummary();
    this.applyPhaseToPurchaseOrders();
    this.applyPhaseToDrafts();
  }

  asCurrency(value: string | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  // The budget box has a two-colour pie (Paid vs Remaining) beside the Total Budget / Paid / Remaining
  // table, drawn with a CSS conic-gradient from the real cost summary. budgetPayment doesn't know about
  // phases, so with a phase picked the figures come from that phase's cost summary totals (Budget +
  // Changes, To Date, Remaining) instead.
  totalBudget(): number {
    const s = this.costSummary;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfBudgetAndChanges ?? 0))
      : this.asCurrency(s?.budgetPayment?.budget);
  }

  totalPaid(): number {
    const s = this.costSummary;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfToDate ?? 0))
      : this.asCurrency(s?.budgetPayment?.paid);
  }

  // Open POs (Sage pchord.status = 1) are commitments, so they reduce what's remaining (Mike Smith,
  // 2026-09-23: "PO does not appear to be subtracting PO items from cost code budget"). PO lines have
  // no phase, so the API reports 0 once a phase is picked, and Remaining is then the phase's budget
  // minus costs to date, as before.
  totalCommitted(): number {
    return this.asCurrency(String(this.costSummary?.costCodeSummaryModel?.sumOfCommitted ?? 0));
  }

  totalRemaining(): number {
    const s = this.costSummary;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfRemaining ?? 0))
      : this.asCurrency(s?.budgetPayment?.balance); // API balance = Remaining, already net of open POs (2026-09-24)
  }

  paidPercent(): number {
    const budget = this.totalBudget();
    const paid = this.totalPaid();
    if (budget <= 0) return 0;
    return Math.min(100, Math.max(0, (paid / budget) * 100));
  }

  resumeDraft(draft: PoDraftSummary): void {
    // Same route and query parameters as resumeDraft in po-queue.component.ts.
    this.router.navigate(['/project-management/new-po-form'], { queryParams: { draftId: draft.draftId } });
  }

  deleteDraft(draft: PoDraftSummary): void {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    this.poRequestService.deleteDraft(draft.draftId).subscribe((deleted) => {
      if (deleted) {
        this.allPoDrafts = this.allPoDrafts.filter((d) => d.draftId !== draft.draftId);
        this.poDrafts = this.poDrafts.filter((d) => d.draftId !== draft.draftId);
        this.cdr.detectChanges();
      }
    });
  }
}
