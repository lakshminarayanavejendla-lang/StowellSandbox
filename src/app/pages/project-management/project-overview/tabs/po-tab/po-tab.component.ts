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
 * NEW tab - Stowell PO Module (built from the "Stowell PO Module" Moqups design spec, page
 * "TAB-Purchase Orders" - confirmed live against app.moqups.com/.../view/page/a8d1d76f3, since
 * the page name/content referenced by earlier comments in this file (git history) had drifted
 * from the real mockup).
 *
 * REBUILT TWICE (Mike Smith report, 2026-09-10 - "PO Tab - does not match Moqup"):
 *   Pass 1 replaced the old single flat page (Purchase Orders + Change Order Log + Back Charge
 *   Log all stacked) with a Budget summary box + 2 toggles + Active/Archived split - WRONG, see
 *   pass 2.
 *   Pass 2 (this version) - a careful top-to-bottom, left-to-right pass through the actual live
 *   mockup (not just the first screenshot) found a THIRD section this file's pass-1 version
 *   missed entirely: the mockup has THREE toggles (Show Draft POs / Show Active POs / Show
 *   Archived POs, all checked by default) and THREE queue sections - "Draft Purchase Order
 *   Queue" (carries the New PO / Duplicate PO buttons), "Active Purchase Order Queue", and
 *   "Archived Purchase Order Queue" - not two. Confirmed identical structure exists on
 *   "TAB-Change Orders" (see co-tab.component.ts), which is what caught the gap.
 *
 * Section data sources:
 *   - Draft: PoRequestService.getDrafts() (same call po-queue.component.ts's page-level Draft
 *     section uses), filtered client-side to this job (PoDraftSummary.jobId === String(projectId))
 *     since there's no per-job draft endpoint. PoDraftSummary has no requiredOnSite field (only
 *     the per-draft detail fetch does), so that column is left blank here rather than firing N
 *     extra requests just to fill it in.
 *   - Active: JobPoService.getJobPoOverview()'s purchaseOrders, filtered to status === 'Open'.
 *   - Archived: same purchaseOrders, everything NOT 'Open' - no explicit "Archived" status is
 *     modeled server-side yet (every PO seen in testing comes back "Open"), so this is the
 *     closest fit until the real status vocabulary is confirmed.
 *
 * FLAG - still not implemented, not guessed at:
 *   - Per-row selection checkboxes shown in every mockup section (their only defined use is
 *     "Duplicate PO" against a selected Draft row) - omitted for now; Duplicate PO stays disabled
 *     regardless (no backend endpoint exists for cloning a PO/draft).
 *   - "Job Phase" header field - no such field exists on BidInfoDto/CurrentCostSummaryViewModel.
 *
 * Change Order Log now lives on its own "TAB-Change Orders" tab (see co-tab.component.ts) - kept
 * OUT of this tab per that split. Back Charge Log has no tab of its own in the mockup, so it's
 * kept here (nowhere else for it to live) below the three PO queues.
 *
 * Job Id/Job Name/Project Folder Library header reuses ProjectOverviewService.getBidDetails()
 * (same source as the other tabs' headers) rather than introducing a duplicate endpoint just for
 * that header row.
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

  // FIX (2026-09-10, live testing): confirmed EJ2 Angular Grid bug, not a timing issue - a grid
  // created with an empty dataSource and later given real data via Angular's [dataSource] input
  // gets stuck (aria-busy="true" forever, 0 rows painted) even though its own internal
  // dataSource/currentViewData are correct and .refresh()/.dataBind() are called directly. Real
  // fix: never mount the grid with an empty array in the first place - gate each <ejs-grid> on
  // its data having actually arrived (@if in the template) so it's created once, already
  // populated, instead of created-empty-then-reassigned.
  poOverviewLoaded = false;
  draftsLoaded = false;

  // Mockup shows all three toggles checked by default.
  showDraftPOs = true;
  showActivePOs = true;
  showArchivedPOs = true;

  // See overview-tab.component.ts for the same IConfiguration("ProjectFolderLibrary") flag.
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

  // Drafts remember the phase they were saved under (dbo.PoRequestDrafts.PhaseNumber, set on the New
  // PO form), so with a phase picked only that phase's drafts show; a draft saved without a phase
  // shows under "All phases" only.
  private allPoDrafts: PoDraftSummary[] = [];

  private applyPhaseToDrafts(): void {
    this.draftsLoaded = false;
    this.cdr.detectChanges();
    const phase = this.phaseFilterActive ? Number(this.selectedPhaseId) : null;
    this.poDrafts = phase === null ? this.allPoDrafts : this.allPoDrafts.filter((d) => d.phaseNumber === phase);
    this.draftsLoaded = true;
    this.cdr.detectChanges();
  }

  // NEW (2026-09-23, Mike Smith - phase dropdown). The phase list is captured on the first
  // (all-phases) load so it doesn't shrink when a single phase is selected.
  phases: Phase[] = [];
  selectedPhaseId = '';

  /** Phase-specific figures/filters apply only when the job really has more than one phase.
   * (Mike Smith, 2026-09-23: with a single phase the amounts must NOT change when it is picked -
   * that phase IS the whole job.) */
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

  // Moqups TAB-Purchase Orders comments (Warren Hampton): "Show only Active/Archived/Drafts for this
  // project and Phase". Active/Archived POs carry their Sage phase (pchord.phsnum -> poPhase), so they
  // filter by the selected phase; Draft POs filter by the phase saved on the draft (see below).
  private allPurchaseOrders: PurchaseOrderRecord[] = [];

  private applyPhaseToPurchaseOrders(): void {
    // Rebuild the grids (loaded=false -> render -> loaded=true) - see the EJ2 note above.
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

  // NEW - the mockup's budget summary box has a two-tone pie graphic (Paid vs Remaining) next to
  // the Total Budget/Paid/Remaining table - rendered as a CSS conic-gradient in the template
  // rather than a static image, driven by real costSummary figures instead of decoration.
  // Summary box figures. budgetPayment isn't phase-aware, so once a phase is picked they come
  // from the phase-filtered cost summary totals (Budget + Changes / To Date / Remaining) instead.
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

  // NEW (2026-09-23, Mike Smith - "PO does not appear to be subtracting PO items from cost code
  // budget"): Open POs (Sage pchord.status = 1) are commitments, so they reduce what's remaining.
  // Not phase-attributable (PO lines carry no phase), so the API reports 0 once a phase is picked -
  // in that view Remaining is just the phase's budget less costs to date, as before.
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
    // Mirrors po-queue.component.ts's resumeDraft - same route/query-param contract.
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
