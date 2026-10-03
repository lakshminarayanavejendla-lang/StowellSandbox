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
 * The Change Orders tab (Moqups page "TAB-Change Orders", checked against the live mockup). The
 * updated mockup moved change orders off the "$ PO" tab onto their own tab, between Purchase Orders
 * and Invoices.
 *
 * Rebuilt with the PO tab after "PO Tab - does not match Moqup" (Mike Smith, 2026-09-10). It used to
 * be one flat grid. Like the PO tab it now has a budget box, three toggles (Show Draft COs, Show
 * Active COs, Show Archived COs, all on by default) and three sections: Draft Change Order Queue
 * (with New CO), Active Change Order Queue and Archived Change Order Queue. See po-tab.component.ts.
 *
 * Where each section's data comes from:
 *   - Draft: CoRequestService.getDrafts(), filtered to this job because there's no per-job draft call.
 *   - Active: changeOrderLog from JobPoService.getJobPoOverview() with coStatus 'Open'.
 *   - Archived: the same list, everything not 'Open'. As on the PO tab, there's no real "Archived"
 *     status yet.
 *
 * The mockup's "CO Type" column has no field in the data, so it's blank. The row checkboxes aren't
 * built, as on the PO tab.
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

  // Each <ejs-grid> is only created once its data has arrived, because a grid created empty and given
  // data later stays stuck (see po-tab.component.ts).
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

  // "For PO, CO, Invoices tabs we need 2 options: show all phases together or show 1 phase at a time"
  // (Mike Smith, 2026-09-23). The same dropdown as the PO tab: "All phases" (the default) or one
  // phase. Picking a phase reloads the budget box for it and shows only that phase's change orders
  // (prmchg.phsnum, as ChangeOrderLogRecord.coPhase).
  phases: Phase[] = [];
  selectedPhaseId = '';
  private allChangeOrders: ChangeOrderLogRecord[] = [];

  /** Phase figures and filters only apply when the job has more than one phase. With a single phase,
   * the amounts mustn't change when it's picked (Mike Smith, 2026-09-23). */
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
    // Rebuild the grids (loaded = false, render, loaded = true); see the EJ2 note above.
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

  // budgetPayment doesn't know about phases, so with a phase picked the budget box uses that phase's
  // cost summary totals (same as the PO tab).
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

  // Same as paidPercent() in po-tab.component.ts.
  paidPercent(): number {
    const budget = this.totalBudget();
    const paid = this.totalPaid();
    if (budget <= 0) return 0;
    return Math.min(100, Math.max(0, (paid / budget) * 100));
  }

  resumeDraft(draft: CoDraftSummary): void {
    // Same route and query parameters as resumeDraft in po-tab.component.ts.
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
