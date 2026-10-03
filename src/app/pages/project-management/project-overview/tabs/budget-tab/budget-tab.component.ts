import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { BudgetLogService } from '../../../../../core/services/budget-log.service';
import { CurrentCostSummaryViewModel, Phase } from '../../../../../core/models/project-management/cost-summary.model';
import { BudgetLogEntry } from '../../../../../core/models/project-management/budget-log.model';

/**
 * The Budget tab (Moqups page TAB-Budget/Financials), asked for by Mike Smith ("Don't forget budget
 * tab like in moqup"). The mockup's Total Budget, Total Paid, Total Remaining, Set Budget and Budget
 * Log had no tab before.
 *
 * The three totals use `budgetPayment` (budget, paid, balance) from
 * getCurrentCostSummaryViewModel(), the same call the Financials tab makes, so no new API is needed.
 * Set Budget opens 'project-budget-configuration/:action/:projectId' (CreateBudgetComponent) with
 * 'ModifyBudget'. project-budget-configuration's linkFor() uses ModifyBudget for jobs from Sage, and a
 * job with its own Project Overview page already exists, so Modify is right here.
 *
 * The Budget Log has no API yet (see budget-log.service.ts).
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

  // The same Phase dropdown as the PO, CO and Invoices tabs: all phases together (the default) or one
  // at a time (Mike Smith, 2026-09-24: "we really need to have a phase dropdown here beside Job
  // Name"). The phase list comes from the all-phases load, so it doesn't shrink when one is picked.
  phases: Phase[] = [];
  selectedPhaseId = '';

  /** Phase figures only apply when the job has more than one phase. With a single phase the amounts
   * mustn't change when it's picked, as on the other tabs. */
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
