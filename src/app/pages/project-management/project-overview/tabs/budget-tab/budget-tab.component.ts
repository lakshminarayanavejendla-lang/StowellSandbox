import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { BudgetLogService } from '../../../../../core/services/budget-log.service';
import { CurrentCostSummaryViewModel, Phase } from '../../../../../core/models/project-management/cost-summary.model';
import { BudgetLogEntry } from '../../../../../core/models/project-management/budget-log.model';

/**
 * NEW tab - client-updated Moqups (page TAB-Budget/Financials). Per Mike Smith's note ("Don't
 * forget budget tab like in moqup") this was the one real gap left after the mockup review:
 * the mockup's Total Budget/Total Paid/Total Remaining + Set Budget + Budget Log block has no
 * home in the tab bar.
 *
 * Total Budget/Paid/Remaining reuse ProjectOverviewService.getCurrentCostSummaryViewModel()'s
 * existing `budgetPayment` field (BudgetPayment: budget/paid/balance) - the SAME API call
 * financials-tab.component.ts already makes for its own (different) content; no new backend
 * dependency for those three figures. "Set Budget" links to the existing
 * 'project-budget-configuration/:action/:projectId' route (CreateBudgetComponent) - defaulting
 * to the 'ModifyBudget' action since this tab only appears once a job already exists (mirrors
 * project-budget-configuration.component.ts's own linkFor() ternary: 'Sage'-sourced jobs get
 * ModifyBudget, new ones get CreateBudget - a job with its own Project Overview page is
 * necessarily already a real job, so Modify is the correct default here, not a guess).
 *
 * Budget Log is new, unbacked data (see budget-log.service.ts) - no existing service exposes a
 * budget change history, same situation as invoices-tab.component.ts's Invoices grid.
 */
@Component({
  selector: 'app-budget-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './budget-tab.component.html',
  styleUrl: './budget-tab.component.scss',
})
export class BudgetTabComponent implements OnChanges {
  @Input({ required: true }) projectId!: number;

  private overviewService = inject(ProjectOverviewService);
  private budgetLogService = inject(BudgetLogService);
  private cdr = inject(ChangeDetectorRef);

  model?: CurrentCostSummaryViewModel;
  logEntries: BudgetLogEntry[] = [];

  // NEW (2026-09-24, Mike Smith - "we really need to have a phase dropdown here beside Job Name"): the same
  // Phase dropdown the PO / CO / Invoices tabs have - all phases together (default) or one phase at a time.
  // (The phase list is captured on the all-phases load so it doesn't shrink when one phase is selected.)
  phases: Phase[] = [];
  selectedPhaseId = '';

  /** Phase figures apply only when the job really has more than one phase (with a single phase the
   * amounts must not change when it is picked - same rule as the other tabs). */
  private get phaseFilterActive(): boolean {
    return this.selectedPhaseId !== '' && this.phases.length > 1;
  }

  ngOnChanges(): void {
    if (!this.projectId) return;

    this.loadCostSummary();

    this.budgetLogService.getBudgetLog(this.projectId).subscribe((entries) => {
      this.logEntries = entries;
      this.cdr.detectChanges();
    });
  }

  private loadCostSummary(): void {
    this.overviewService
      .getCurrentCostSummaryViewModel(String(this.projectId), this.phaseFilterActive ? this.selectedPhaseId : '')
      .subscribe((m) => {
        this.model = m;
        if (!this.phaseFilterActive) this.phases = m.phases ?? [];
        this.cdr.detectChanges();
      });
  }

  onPhaseChange(phaseId: string): void {
    this.selectedPhaseId = phaseId;
    this.loadCostSummary();
  }

  totalBudget(): number {
    const s = this.model;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfBudgetAndChanges ?? 0))
      : this.asCurrency(s?.budgetPayment?.budget);
  }

  totalPaid(): number {
    const s = this.model;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfToDate ?? 0))
      : this.asCurrency(s?.budgetPayment?.paid);
  }

  totalRemaining(): number {
    const s = this.model;
    return this.phaseFilterActive
      ? this.asCurrency(String(s?.costCodeSummaryModel?.sumOfRemaining ?? 0))
      : this.asCurrency(s?.budgetPayment?.balance);
  }

  asCurrency(value: string | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
