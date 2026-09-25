import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, PageService, SortService } from '@syncfusion/ej2-angular-grids';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { JobPoService } from '../../../../../core/services/job-po.service';
import { CoRequestService } from '../../../../../core/services/co-request.service';
import { BidInfoDto } from '../../../../../core/models/project-management/bid-info.model';
import { ChangeOrderLogRecord } from '../../../../../core/models/project-management/job-po.model';
import { CurrentCostSummaryViewModel, Phase } from '../../../../../core/models/project-management/cost-summary.model';
import { CoDraftSummary } from '../../../../../core/models/project-management/po-draft.model';

/**
 * NEW tab - client-updated Moqups (page "TAB-Change Orders" - confirmed live against
 * app.moqups.com/.../view/page/ab12f772c), splitting Change Orders out of the "$ PO" tab's
 * combined view into its own tab per the updated mockup's tab bar (Overview / Details / Purchase
 * Orders / Change Orders / Invoices / Reporting / Documents).
 *
 * REBUILT (Mike Smith report, 2026-09-10 - "PO Tab - does not match Moqup", same root-cause pass
 * that rebuilt po-tab.component.ts): this tab used to be one flat "Change Order Queue" grid. The
 * real mockup has the identical 3-way structure po-tab.component.ts has - a Budget summary box +
 * THREE toggles (Show Draft COs / Show Active COs / Show Archived COs, all checked by default)
 * revealing three sections: "Draft Change Order Queue" (carries the New CO button), "Active
 * Change Order Queue", "Archived Change Order Queue". Mirrors po-tab.component.ts's
 * section/data-source pattern 1:1 - see that file's header comment for the fuller rationale.
 *
 * Section data sources:
 *   - Draft: CoRequestService.getDrafts(), filtered client-side to this job
 *     (CoDraftSummary.jobId === String(projectId)) - no per-job draft endpoint exists.
 *   - Active: JobPoService.getJobPoOverview()'s changeOrderLog, filtered to coStatus === 'Open'.
 *   - Archived: same changeOrderLog, everything NOT 'Open' - same "no explicit Archived status
 *     modeled yet" caveat as the PO tab.
 *
 * FLAG: the mockup's "CO Type" column has no backing field anywhere in ChangeOrderLogRecord/
 * CoDraftSummary - left blank rather than guessed at. Per-row selection checkboxes (mockup's only
 * defined use for them, like PO's, would be some bulk action against Draft rows) are not
 * implemented, same as po-tab.component.ts.
 */
@Component({
  selector: 'app-co-tab',
  standalone: true,
  imports: [GridModule, RouterLink, FormsModule, CurrencyPipe],
  providers: [PageService, SortService],
  templateUrl: './co-tab.component.html',
  styleUrl: './co-tab.component.scss',
})
export class CoTabComponent implements OnChanges {
  @Input({ required: true }) projectId!: number;

  private overviewService = inject(ProjectOverviewService);
  private jobPoService = inject(JobPoService);
  private coRequestService = inject(CoRequestService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  bidModel?: BidInfoDto;
  costSummary?: CurrentCostSummaryViewModel;

  activeChangeOrders: ChangeOrderLogRecord[] = [];
  archivedChangeOrders: ChangeOrderLogRecord[] = [];
  coDrafts: CoDraftSummary[] = [];

  // See po-tab.component.ts's header comment on this same fix - EJ2 grids created with an empty
  // dataSource and later reassigned real data get permanently stuck unrendered. Gating each
  // <ejs-grid> on its data having actually arrived avoids the bug.
  changeOrdersLoaded = false;
  draftsLoaded = false;

  showDraftCOs = true;
  showActiveCOs = true;
  showArchivedCOs = true;

  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnChanges(): void {
    if (!this.projectId) return;

    this.overviewService.getBidDetails(this.projectId).subscribe((b) => {
      this.bidModel = b;
      this.cdr.detectChanges();
    });

    this.selectedPhaseId = '';
    this.loadCostSummary();

    this.changeOrdersLoaded = false;
    this.jobPoService.getJobPoOverview(this.projectId).subscribe((data) => {
      this.allChangeOrders = data.changeOrderLog ?? [];
      this.applyPhaseToChangeOrders();
    });

    this.draftsLoaded = false;
    this.coRequestService.getDrafts().subscribe((drafts) => {
      this.coDrafts = drafts.filter((d) => d.jobId === String(this.projectId));
      this.draftsLoaded = true;
      this.cdr.detectChanges();
    });
  }

  // NEW (2026-09-23, Mike Smith - "For PO, CO, Invoices tabs we need 2 options: show all phases
  // together or show 1 phase at a time"). Same dropdown as po-tab.component.ts: "All phases"
  // (default, as before) or one phase. A phase re-queries the budget box for that phase and filters
  // the change order log to that phase's COs (prmchg.phsnum, via ChangeOrderLogRecord.coPhase).
  phases: Phase[] = [];
  selectedPhaseId = '';
  private allChangeOrders: ChangeOrderLogRecord[] = [];

  /** Phase-specific figures/filters apply only when the job really has more than one phase.
   * (Mike Smith, 2026-09-23: with a single phase the amounts must NOT change when it is picked.) */
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

  private applyPhaseToChangeOrders(): void {
    // Rebuild the grids (loaded=false -> render -> loaded=true) - see the EJ2 note above.
    this.changeOrdersLoaded = false;
    this.cdr.detectChanges();
    const phase = this.phaseFilterActive ? Number(this.selectedPhaseId) : null;
    const all = phase === null ? this.allChangeOrders : this.allChangeOrders.filter((c) => c.coPhase === phase);
    this.activeChangeOrders = all.filter((c) => (c.coStatus ?? '').toLowerCase() === 'open');
    this.archivedChangeOrders = all.filter((c) => (c.coStatus ?? '').toLowerCase() !== 'open');
    this.changeOrdersLoaded = true;
    this.cdr.detectChanges();
  }

  onPhaseChange(phaseId: string): void {
    this.selectedPhaseId = phaseId;
    this.loadCostSummary();
    this.applyPhaseToChangeOrders();
  }

  // Budget box: budgetPayment isn't phase-aware, so once a phase is picked the figures come from
  // the phase-filtered cost summary totals (same rule as po-tab.component.ts).
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

  totalRemaining(): number {
    const s = this.costSummary;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfRemaining ?? 0))
      : this.asCurrency(s?.budgetPayment?.balance);
  }

  asCurrency(value: string | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  // See po-tab.component.ts's paidPercent() header comment - same reasoning.
  paidPercent(): number {
    const budget = this.totalBudget();
    const paid = this.totalPaid();
    if (budget <= 0) return 0;
    return Math.min(100, Math.max(0, (paid / budget) * 100));
  }

  resumeDraft(draft: CoDraftSummary): void {
    // Mirrors po-tab.component.ts's resumeDraft - same route/query-param contract.
    this.router.navigate(['/project-management/new-co-form'], { queryParams: { draftId: draft.draftId } });
  }

  deleteDraft(draft: CoDraftSummary): void {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    this.coRequestService.deleteDraft(draft.draftId).subscribe((deleted) => {
      if (deleted) {
        this.coDrafts = this.coDrafts.filter((d) => d.draftId !== draft.draftId);
        this.cdr.detectChanges();
      }
    });
  }
}
