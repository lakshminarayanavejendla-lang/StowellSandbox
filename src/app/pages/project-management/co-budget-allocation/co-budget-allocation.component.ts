import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AccumulationChartModule,
  AccumulationDataLabelService,
  AccumulationLegendService,
  AccumulationTooltipService,
  PieSeriesService,
} from '@syncfusion/ej2-angular-charts';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { JobCostCodeService } from '../../../core/services/job-cost-code.service';
import { JobCostCodeOption } from '../../../core/models/project-management/job-cost-code.model';
import { JobPhaseService } from '../../../core/services/job-phase.service';
import { JobPhaseOption } from '../../../core/models/project-management/job-phase.model';
import { CoBudgetAllocationService } from '../../../core/services/co-budget-allocation.service';
import { AuthService } from '../../../core/services/auth.service';
import { CoBudgetAllocationType, CoBudgetLine, CoBudgetAllocationSubmission } from '../../../core/models/project-management/co-budget-allocation.model';
import { UsdInputDirective } from '../../../shared/usd-input/usd-input.directive';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

interface PieSlice {
  label: string;
  value: number;
}

/**
 * Change Order Budget Allocation (Moqups page FORM-CO Reallocation, link shared 2026-09-13). One
 * form where any cost code line in the Budget Update grid can have both a Debit and a Credit
 * ("Add Line"), instead of picking one source cost code first.
 *
 * CO Type decides the numbering and required fields (2026-09-14):
 *   - Prime: "BC" + year + 4-digit sequence, such as BC20260001. Requested Amount and Approved
 *     Amount are also required (greyed out for Internal), checked here and in
 *     CO_SubmitBudgetReallocation.
 *   - Internal: "CO" + year + sequence, such as CO20260001.
 *   Nobody can edit the CO Number. It shows as a preview once CO Type is picked, but the server
 *   works out the real number and checks it on Submit (see onCoTypeChange()). The sequence is per
 *   prefix and year, not per job.
 *
 * Saving writes to the app's own CoBudgetAllocations tables in SAGESBQ. A submitted allocation waits
 * for Accounting, and approving it posts the lines to the job's Sage budget
 * (CO_PostBudgetAllocationToSage).
 */
@Component({
  selector: 'app-co-budget-allocation',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, AccumulationChartModule, UsdInputDirective],
  providers: [PieSeriesService, AccumulationLegendService, AccumulationTooltipService, AccumulationDataLabelService],
  templateUrl: './co-budget-allocation.component.html',
  styleUrl: './co-budget-allocation.component.scss',
})
export class CoBudgetAllocationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private costCodeService = inject(ProjectCostCodeService);
  private jobCostCodeService = inject(JobCostCodeService);
  private jobPhaseService = inject(JobPhaseService);
  private allocationService = inject(CoBudgetAllocationService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  recJobNumber = recJobNumber;
  jobs: CostCodeRecord[] = [];
  costCodes: JobCostCodeOption[] = [];

  selectedJobId = '';
  jobName = '';
  coType: CoBudgetAllocationType = '';
  coNumber = '';
  coDescription = '';
  coReason = '';
  coStatus = '';
  overallBudget = 0;
  profitOnSell = 0;
  requestedAmount: number | null = null;
  approvedAmount: number | null = null;

  // These come from StowellSandbox in ngOnInit (getLookups): statuses from Sage's chgtyp table and
  // reasons already used on real change orders (Mike Smith, 2026-09-20: "these dropdowns should be
  // from stowellsandbox"). The values below are only used if that call fails, so the dropdowns are
  // never empty.
  coReasonOptions: string[] = ['Owner Request', 'Field Condition', 'Design Change', 'Budget Rebalance', 'Other'];
  // Moqups: "CO Status must match Sage / Pull from Sage100 CO Status / MANDATORY and blank to force
  // user input". Filled from Sage's chgtyp by getLookups(), with no fallback list on purpose, so a
  // value that isn't in Sage can't be offered. (The old list, Draft/Pending/Approved/Rejected, had
  // none of Sage's values.)
  coStatusOptions: string[] = [];

  // Every cost code, so the Budget Update picker isn't limited to codes the job already has a budget
  // line for (Mike Smith, 2026-09-20: "I need to be able to see all cost codes in the dropdown"). If
  // it hasn't loaded or fails, the picker uses the job's own cost codes.
  allCostCodes: { costCode: number; costCodeDescription: string }[] = [];

  // Once the user types their own Requested or Approved Amount (Prime only), stop replacing them with
  // the Budget Update total (see updatePieData()).
  amountsEdited = false;

  // Phase is a dropdown of the job's Sage phases (see JobPhaseService). `phases`, the list of added
  // phases, works as before.
  availablePhases: JobPhaseOption[] = [];
  newPhase: number | null = null;

  /**
   * The Phase dropdown is created again each time this changes (see the template). Without that, the
   * browser keeps showing the last phase picked: after a pick, and again when the job changes and the
   * same option comes back. A new dropdown always starts on "Select phase".
   */
  phaseSelectKey = 0;

  private clearPhaseSelect(): void {
    this.phaseSelectKey++;
  }
  phases: string[] = [];

  newLineCostCode: number | null = null;
  newLineDebit: number | null = null;
  newLineCredit: number | null = null;
  lines: CoBudgetLine[] = [];

  statusMessage = '';

  // For opening a saved or submitted allocation to edit (the 'co-budget-allocation/:allocationId'
  // and 'co-budget-reallocation/:allocationId' routes, and CoBudgetAllocationService.getById).
  allocationId: number | null = null;

  pieData: PieSlice[] = [];
  readonly pieColors = ['#0479CC', '#f4b8ac', '#7cb342', '#ffb300', '#8e24aa', '#00838f'];
  legendSettings = { visible: true, position: 'Bottom' as const };

  get isPrime(): boolean {
    return this.coType === 'Prime';
  }

  // The names are confusing (Mike Smith, 2026-09-24: "need debits to subtract and credits to add").
  // The saved fields keep their old meaning: `debit` is added to the cost code's budget and `credit`
  // is taken off, in CO_SubmitBudgetReallocation, CO_PostBudgetAllocationToSage and every saved
  // allocation. The screen swaps the headings: the "Credit" column edits `debit` (adds) and the
  // "Debit" column edits `credit` (takes off). So Budget Change Total = added - taken off = debit - credit.
  get budgetChangeTotal(): number {
    return this.lines.reduce((sum, l) => sum + ((Number(l.debit) || 0) - (Number(l.credit) || 0)), 0);
  }

  get mandatoryFieldsMissing(): string[] {
    const missing: string[] = [];
    if (!this.coType) missing.push('CO Type');
    if (!this.selectedJobId) missing.push('Job ID');
    if (this.isPrime && !this.coNumber.trim()) missing.push('CO Number');
    if (!this.phases.length) missing.push('Phase');
    if (!this.coDescription.trim()) missing.push('CO Description');
    if (!this.coReason) missing.push('CO Reason');
    if (!this.coStatus) missing.push('CO Status');
    if (this.isPrime) {
      if (this.requestedAmount == null) missing.push('Requested Amount');
      if (this.approvedAmount == null) missing.push('Approved Amount');
    }
    return missing;
  }

  ngOnInit(): void {
    this.costCodeService.getAllUserJobs().subscribe((jobs) => {
      this.jobs = jobs;
      this.cdr.detectChanges();
    });

    this.allocationService.getLookups().subscribe((lookups) => {
      if (lookups?.reasons?.length) this.coReasonOptions = lookups.reasons;
      if (lookups?.statuses?.length) this.coStatusOptions = lookups.statuses;
      this.cdr.detectChanges();
    });


    // Accounting approval (Mike Smith, 2026-09-26): 'co-budget-allocation-approval/:requestId' opens a
    // submitted allocation read-only with Approve and Reject. Approve posts it to Sage; Reject marks it
    // rejected and it leaves the queue.
    const requestParam = this.route.snapshot.paramMap.get('requestId');
    if (requestParam) {
      this.isApproval = true;
      this.loadForEdit(Number(requestParam));
      return;
    }

    const idParam = this.route.snapshot.paramMap.get('allocationId');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isNaN(id)) this.loadForEdit(id);
  }

  /** True when the page was opened from the Accounting Queue to approve or reject a submitted allocation. */
  isApproval = false;
  rejectionReason = '';
  showRejectReason = false;

  openRejectReason(): void {
    this.showRejectReason = true;
  }

  cancelReject(): void {
    this.showRejectReason = false;
    this.rejectionReason = '';
  }

  approve(): void {
    if (this.allocationId == null) return;
    this.allocationService.approveRequest(this.allocationId).subscribe((result) => {
      this.statusMessage = result.succeeded ? 'Allocation approved and posted to Sage.' : ('Approve failed: ' + (result.error ?? 'unknown error'));
      this.cdr.detectChanges();
      if (result.succeeded) this.backToAccountingQueue();
    });
  }

  confirmReject(): void {
    if (this.allocationId == null || !this.rejectionReason.trim()) return;
    this.allocationService.rejectRequest(this.allocationId, this.rejectionReason).subscribe((result) => {
      this.statusMessage = result.succeeded ? 'Allocation rejected and removed from the queue.' : ('Reject failed: ' + (result.error ?? 'unknown error'));
      if (result.succeeded) this.showRejectReason = false;
      this.cdr.detectChanges();
      if (result.succeeded) this.backToAccountingQueue();
    });
  }

  /** Once Accounting has decided, go back to the Accounting Queue (the allocation is no longer in it). */
  private backToAccountingQueue(): void {
    setTimeout(() => this.router.navigate(['/accounting']), 1200);
  }

  /** See the allocationId field. */
  private loadForEdit(id: number): void {
    this.allocationId = id;
    (this.isApproval ? this.allocationService.getApprovalRequest(id) : this.allocationService.getById(id)).subscribe((detail) => {
      if (!detail) {
        this.statusMessage = `Could not load CO budget allocation ${id}.`;
        this.cdr.detectChanges();
        return;
      }

      this.selectedJobId = detail.jobId;
      this.jobName = detail.jobName;
      this.coType = detail.coType;
      this.coNumber = detail.coNumber;
      this.coDescription = detail.coDescription;
      this.coReason = detail.coReason;
      this.coStatus = detail.coStatus;
      this.overallBudget = detail.overallBudget;
      this.profitOnSell = detail.profitOnSell;
      this.requestedAmount = detail.requestedAmount;
      this.approvedAmount = detail.approvedAmount;
      this.phases = [...detail.phases];
      // Show only the lines this allocation saved, not every cost code on the job (see onJobChange()).
      this.lines = [...detail.lines];
      // When reopening, the saved Requested, Approved and Profit values win; updatePieData() mustn't
      // work them out again from the lines.
      this.amountsEdited = true;
      // A saved reason or status that isn't in the loaded lists still needs to show in its dropdown.
      if (this.coReason && !this.coReasonOptions.includes(this.coReason)) this.coReasonOptions = [...this.coReasonOptions, this.coReason];
      if (this.coStatus && !this.coStatusOptions.includes(this.coStatus)) this.coStatusOptions = [...this.coStatusOptions, this.coStatus];
      this.updatePieData();

      // Loads cost codes for the Item picker without onJobChange(), which would also recalculate
      // overallBudget from the job's live cost codes and overwrite the saved OverallBudget and ProfitOnSell.
      if (this.selectedJobId) {
        this.loadAllCostCodes(this.selectedJobId);
        this.jobCostCodeService.getJobCostCodes(this.selectedJobId).subscribe((codes) => {
          this.costCodes = codes.map((c) => ({ ...c, display: `${c.costCode} - ${c.costCodeDescription}` }));
          this.cdr.detectChanges();
        });
      }

      this.cdr.detectChanges();
    });
  }

  onJobChange(recNum: string): void {
    this.selectedJobId = recNum;
    const match = this.jobs.find((j) => String(j.recNum) === recNum);
    this.jobName = match?.jobNumber ?? '';

    this.costCodes = [];
    this.lines = [];
    this.pieData = [];
    this.availablePhases = [];
    this.newPhase = null;
    // The phases picked for the old job don't apply to the new one. If they stayed, the picker would
    // hide every phase the new job shares with the old one (the dropdown leaves out phases already added).
    this.phases = [];
    this.clearPhaseSelect();
    this.phaseBudgets = null;
    if (!recNum) return;

    this.loadPhaseBudgets(recNum);

    // Each reply is only used if this job is still the selected one. Otherwise a slow reply for the job
    // you just left could overwrite the new job's data.
    this.jobCostCodeService.getJobCostCodes(recNum).subscribe((codes) => {
      if (this.selectedJobId !== recNum) return;
      this.costCodes = codes.map((c) => ({ ...c, display: `${c.costCode} - ${c.costCodeDescription}` }));
      this.overallBudget = this.costCodes.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
      this.cdr.detectChanges();
    });

    this.jobPhaseService.getJobPhases(recNum).subscribe((phases) => {
      if (this.selectedJobId !== recNum) return;
      this.availablePhases = phases;
      this.cdr.detectChanges();
      this.clearPhaseSelect();
    });

    this.loadAllCostCodes(recNum);
  }

  // --- Phase check before Submit (Mike Smith, 2026-09-24: "Submit failed ... 500" on an Internal allocation) ---
  // Submit posts to the job's Sage budget lines (CO_PostBudgetAllocationToSage) under the first phase
  // picked. The server refuses with a 500, and saves nothing, when (1) a cost code takes budget off
  // but has no budget line in that phase, or (2) a cost code would go below zero. Both are checked
  // here first, so the user is told which cost code and phase to fix. `phaseBudgets` holds each cost
  // code's budget per phase, or null if it couldn't load; then the check is skipped and the server
  // still enforces the rules.
  phaseBudgets: { costCode: number; phase: number; budget: number }[] | null = null;

  private loadPhaseBudgets(jobId: string): void {
    this.allocationService.getPhaseBudgets(jobId).subscribe((rows) => {
      if (this.selectedJobId === jobId) this.phaseBudgets = rows;
      this.cdr.detectChanges();
    });
  }

  /** The phase the budget will be posted to: the first one in the phase list, as the server does. */
  get postingPhase(): number | null {
    if (!this.phases.length) return null;
    const n = parseInt(this.phases[0], 10);
    return Number.isNaN(n) ? null : n;
  }

  private sameCode(a: number | string, b: number | string): boolean {
    return Math.abs(Number(a) - Number(b)) < 0.0005;
  }

  private money(n: number): string {
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Net budget change per cost code: `debit` adds and `credit` takes off, as CO_PostBudgetAllocationToSage
   * does. The screen labels them the other way round (see the note on budgetChangeTotal). */
  private netByCode(): { code: string; label: string; net: number }[] {
    const map = new Map<string, { code: string; label: string; net: number }>();
    for (const l of this.lines) {
      const key = Number(l.costCode).toFixed(3);
      const entry = map.get(key) ?? { code: l.costCode, label: `${l.costCode} - ${l.costCodeDescription}`, net: 0 };
      entry.net += (Number(l.debit) || 0) - (Number(l.credit) || 0);
      map.set(key, entry);
    }
    return [...map.values()].filter((e) => e.net !== 0);
  }

  /** Problems that would make Submit fail on the server, in plain words. Empty means fine, or not checkable yet. */
  get phaseIssues(): string[] {
    const phase = this.postingPhase;
    if (this.phaseBudgets === null || phase === null || !this.lines.length) return [];

    const issues: string[] = [];
    for (const e of this.netByCode()) {
      const rows = this.phaseBudgets.filter((r) => this.sameCode(r.costCode, e.code));
      const here = rows.filter((r) => r.phase === phase);
      const hereBudget = here.reduce((s, r) => s + r.budget, 0);

      if (e.net < 0 && !here.length) {
        const elsewhere = [...new Set(rows.map((r) => r.phase))].sort((a, b) => a - b);
        issues.push(
          elsewhere.length
            ? `${e.label}: you are taking ${this.money(-e.net)} out of it, but it has no budget under phase ${phase}. Its budget is under phase ${elsewhere.join(' and ')} - pick that phase.`
            : `${e.label}: you are taking ${this.money(-e.net)} out of it, but it has no budget on this job at all - it can only be added to, not deducted from.`
        );
      } else if (here.length && hereBudget + e.net < 0) {
        issues.push(
          `${e.label}: it has ${this.money(hereBudget)} under phase ${phase}, so ${this.money(-e.net)} cannot be taken out (it would go to ${this.money(hereBudget + e.net)}).`
        );
      }
    }
    return issues;
  }

  /** One phase that has budget for every cost code that failed the "no budget in this phase" rule, if there is one. */
  get suggestedPhase(): number | null {
    const phase = this.postingPhase;
    if (this.phaseBudgets === null || phase === null) return null;

    // The cast stops TypeScript narrowing `common` to just null, which would reject the loop below.
    let common = null as Set<number> | null;
    for (const e of this.netByCode()) {
      const rows = this.phaseBudgets.filter((r) => this.sameCode(r.costCode, e.code));
      if (e.net < 0 && !rows.some((r) => r.phase === phase)) {
        const ph = new Set(rows.map((r) => r.phase));
        common = common === null ? ph : new Set([...common].filter((p) => ph.has(p)));
      }
    }
    if (common === null || !common.size) return null;
    const pick = [...common].sort((a, b) => a - b)[0];
    return this.availablePhases.some((p) => p.phaseNumber === pick) ? pick : null;
  }

  /** One click: switch the allocation to the suggested phase. */
  applySuggestedPhase(): void {
    const pick = this.suggestedPhase;
    const match = this.availablePhases.find((p) => p.phaseNumber === pick);
    if (!match) return;
    this.phases = [`${match.phaseNumber} - ${match.phaseName}`];
  }

  /** The server posts to the first phase only; say so if more than one is listed. */
  get phaseNote(): string {
    return this.phases.length > 1
      ? `Only the first phase (${this.phases[0]}) is used for the budget change; the other phases listed are not.`
      : '';
  }

  /** The full cost code master list, as this job's own cost codes (see availableCostCodesForNewLine). */
  private loadAllCostCodes(jobId: string): void {
    this.allCostCodes = [];
    this.allocationService.getAllCostCodes(jobId).subscribe((codes) => {
      if (this.selectedJobId !== jobId) return;
      this.allCostCodes = codes;
      this.cdr.detectChanges();
    });
  }

  /** Remaining Budget column for a manually-added Budget Update row. */
  remainingForCode(costCode: string): number {
    return this.costCodes.find((c) => String(c.costCode) === costCode)?.remaining ?? 0;
  }

  /** Shows the CO Number as soon as CO Type is picked, instead of only after Submit. Nobody can edit
   * it, for Prime or Internal. It's only a preview, not a reservation (see getNextNumber in
   * CoBudgetAllocationService): two people picking the same type at once can see the same number. So
   * buildPayload() doesn't send it, and the server works out the real number under a lock. Sending
   * the preview would skip that check and could give two submissions the same CoNumber. */
  onCoTypeChange(coType: CoBudgetAllocationType): void {
    this.coType = coType;
    this.recalcProfitOnSell();
    if (!coType) return;

    this.allocationService.getNextNumber(coType).subscribe((preview) => {
      if (preview) this.coNumber = preview;
      this.cdr.detectChanges();
    });
  }

  /** Picking a phase adds it to the phase list straight away, because Submit checks that list, not the
   * dropdown (Mike Smith, 2026-09-23: "Cannot submit - missing: Phase" with 0-None picked). */
  onPhasePicked(phaseNumber: number | null): void {
    this.newPhase = phaseNumber;
    if (phaseNumber !== null) {
      this.addPhase();
      // the browser keeps showing the pick; show "Select phase" again once the list has updated
      setTimeout(() => {
        this.clearPhaseSelect();
        this.cdr.detectChanges();
      });
    }
  }

  addPhase(): void {
    const match = this.availablePhases.find((p) => p.phaseNumber === this.newPhase);
    if (!match) return;
    const display = `${match.phaseNumber} - ${match.phaseName}`;
    if (this.phases.includes(display)) return;
    this.phases.push(display);
    this.newPhase = null;
  }

  removePhase(index: number): void {
    this.phases.splice(index, 1);
  }

  /** Leaves out phases already added, so this picker can't add one twice. */
  get availablePhasesForNewPhase(): JobPhaseOption[] {
    return this.availablePhases.filter((p) => !this.phases.includes(`${p.phaseNumber} - ${p.phaseName}`));
  }

  onLineCostCodeSelected(costCode: number | null): void {
    this.newLineCostCode = costCode;
  }

  /** Every cost code (the full list if it loaded, otherwise the job's own budget lines), minus codes
   * that already have a Budget Update row, so the same code can't get two rows. Offering the full
   * list lets one code be debited and another credited, even one the job hasn't budgeted yet. */
  get availableCostCodesForNewLine(): { costCode: number; costCodeDescription: string }[] {
    // The list also has about 60 job-specific codes (such as 12162402.104). They're only offered for
    // their own job, so other jobs' codes don't clutter the list.
    return this.pickerCodes.filter((c) => !this.lines.some((l) => l.costCode === String(c.costCode)));
  }

  /** The list shows each cost code in this job's own numbering (10120.103 for "1012 - GC - Employee
   * Housing"), but older jobs keep budget under the plain code (1012.000). Picking the job-numbered
   * code made a line with no budget, and an addition would have created a new cost code (Mike Smith,
   * 2026-09-24, job 10120). So when the job already has a budget line under the plain code (the number
   * at the start of the description), that code is used with the job's description. Codes the job
   * budgets under its own numbering, such as 12162402.104, stay as they are. Job cost codes missing
   * from the list are still offered. */
  private get pickerCodes(): { costCode: number; costCodeDescription: string }[] {
    if (!this.allCostCodes.length) return this.costCodes;
    const own = new Map(this.costCodes.map((c) => [Number(c.costCode), c]));
    const seen = new Set<number>();
    const out: { costCode: number; costCodeDescription: string }[] = [];
    for (const c of this.allCostCodes) {
      const plain = Number(/^\s*(\d+)\s*-/.exec(c.costCodeDescription ?? '')?.[1]);
      const mine = Number.isFinite(plain) ? own.get(plain) : undefined;
      const resolved = mine ? { costCode: Number(mine.costCode), costCodeDescription: mine.costCodeDescription } : c;
      if (seen.has(resolved.costCode)) continue;
      seen.add(resolved.costCode);
      out.push(resolved);
    }
    for (const c of this.costCodes) {
      if (!seen.has(Number(c.costCode))) out.push({ costCode: Number(c.costCode), costCodeDescription: c.costCodeDescription });
    }
    return out;
  }

  addLine(): void {
    const match = this.pickerCodes.find((c) => c.costCode === this.newLineCostCode);
    if (!match) return;
    if (!this.newLineDebit && !this.newLineCredit) return;

    this.lines.push({
      costCode: String(match.costCode),
      costCodeDescription: match.costCodeDescription,
      debit: this.newLineDebit ?? 0,
      credit: this.newLineCredit ?? 0,
    });
    this.newLineCostCode = null;
    this.newLineDebit = null;
    this.newLineCredit = null;
    this.updatePieData();
  }

  removeLine(index: number): void {
    this.lines.splice(index, 1);
    this.updatePieData();
  }

  /** Also called from the template when a row's Debit or Credit changes. Skips untouched (0/0) rows,
   * so a line edited back to zero doesn't leave an empty slice in the chart. It also keeps Requested
   * and Approved Amount in step with the total. They're calculated and read-only, so the fields
   * buildPayload() sends must be updated here too, not just the screen. */
  updatePieData(): void {
    this.pieData = this.lines
      .filter((l) => (Number(l.debit) || 0) !== 0 || (Number(l.credit) || 0) !== 0)
      .map((l) => ({
        label: `${l.costCode} - ${l.costCodeDescription}`,
        value: (Number(l.debit) || 0) + (Number(l.credit) || 0),
      }));

    // Requested and Approved Amount follow the total until the user types their own (Prime only, see
    // onAmountEdited()). After that they're left alone.
    if (!this.amountsEdited) {
      this.requestedAmount = this.budgetChangeTotal;
      this.approvedAmount = this.budgetChangeTotal;
    }
    this.recalcProfitOnSell();
  }

  /** Requested and Approved Amount can be typed for a Prime CO (Mike Smith, 2026-09-20: "need to be
   * able to edit Requested amount and Approved Amount. That way Profit on sell will work"). This marks
   * them as edited so updatePieData() stops overwriting them, and updates Profit on Sell. */
  onAmountEdited(): void {
    this.amountsEdited = true;
    this.recalcProfitOnSell();
  }

  /** Profit on Sell (Prime only), from Warren Hampton's note on the Moqups page:
   *   = (Total Approved Amount - Budget Change Total) / Total Approved Amount
   * That's a margin percentage, not dollars. The old version showed the dollar difference (Mike Smith,
   * 2026-09-22: "Profit on Sell formula appears wrong"). Budget Change Total is what the lines add to
   * the budget (see budgetChangeTotal). With no approved amount it shows 0. Internal COs have no
   * approved amount, so Profit on Sell is typed by hand there. Stored as a percentage, so 35 means 35%. */
  private recalcProfitOnSell(): void {
    if (!this.isPrime) return;
    const approved = Number(this.approvedAmount) || 0;
    this.profitOnSell = approved > 0 ? Math.round(((approved - this.budgetChangeTotal) / approved) * 10000) / 100 : 0;
  }

  private buildPayload(): CoBudgetAllocationSubmission {
    return {
      // coNumber is always blank here on purpose (see onCoTypeChange()). The number on screen is only
      // a preview; sending it would skip the server's lock and check and could duplicate a CoNumber.
      coNumber: '',
      jobId: this.selectedJobId,
      jobName: this.jobName,
      coType: this.coType,
      coDescription: this.coDescription,
      coReason: this.coReason,
      coStatus: this.coStatus,
      overallBudget: this.overallBudget,
      profitOnSell: this.profitOnSell,
      requestedAmount: this.isPrime ? this.requestedAmount : null,
      approvedAmount: this.isPrime ? this.approvedAmount : null,
      createdBy: this.authService.getLoggedInUserEmail() ?? 'Unknown User',
      phases: this.phases,
      lines: this.lines.filter((l) => (Number(l.debit) || 0) !== 0 || (Number(l.credit) || 0) !== 0),
    };
  }

  saveCo(): void {
    this.allocationService.save(this.buildPayload()).subscribe((result) => {
      this.statusMessage = result.saved ? 'CO budget allocation saved.' : `Save failed: ${result.error ?? 'unknown error'}`;
      this.cdr.detectChanges();
    });
  }

  submit(): void {
    if (this.mandatoryFieldsMissing.length) {
      this.statusMessage = `Cannot submit - missing: ${this.mandatoryFieldsMissing.join(', ')}`;
      return;
    }

    const issues = this.phaseIssues;
    if (issues.length) {
      this.statusMessage = `Cannot submit - ${issues[0]}${issues.length > 1 ? ` (and ${issues.length - 1} more - see the list above the Budget Update grid)` : ''}`;
      return;
    }

    this.allocationService.submit(this.buildPayload()).subscribe((result) => {
      if (result.submitted) {
        // A submitted allocation waits for Accounting approval, and the CO number is given on approval (Mike Smith, 2026-09-26).
        this.statusMessage = `CO budget allocation submitted for Accounting approval (request #${result.requestId}).`;
        this.resetForm();
      } else {
        this.statusMessage = `Submit failed: ${result.error ?? 'unknown error'}`;
      }
      this.cdr.detectChanges();
    });
  }

  /** Deletes the allocation that's open (2026-09-20). The server undoes a submitted allocation's change
   * to the budget lines, so this asks first. */
  deleteAllocation(): void {
    if (this.allocationId == null) return;
    const ok = window.confirm(
      `Delete change order allocation ${this.coNumber || this.allocationId}? If it was already posted, deleting it needs Accounting's approval, and its budget changes are only reversed once they approve.`
    );
    if (!ok) return;

    this.allocationService.delete(this.allocationId, this.authService.getLoggedInUserEmail() ?? 'Unknown User').subscribe((result) => {
      if (result.pendingApproval) {
        this.statusMessage = `Deleting this allocation was sent to Accounting for approval (request #${result.requestId}). Nothing changes in Sage until they approve.`;
      } else if (result.deleted) {
        this.statusMessage = 'CO budget allocation deleted.';
        this.resetForm();
      } else {
        this.statusMessage = `Delete failed: ${result.error ?? 'unknown error'}`;
      }
      this.cdr.detectChanges();
    });
  }

  /** Resets the form after a successful submit, ready for the next allocation. Keeps `jobs`, the job
   * list, and `statusMessage`, the success message submit() just set. */
  private resetForm(): void {
    this.costCodes = [];
    this.phaseBudgets = null;
    this.selectedJobId = '';
    this.jobName = '';
    this.coType = '';
    this.coNumber = '';
    this.coDescription = '';
    this.coReason = '';
    this.coStatus = '';
    this.overallBudget = 0;
    this.profitOnSell = 0;
    this.requestedAmount = null;
    this.approvedAmount = null;
    this.amountsEdited = false;
    this.availablePhases = [];
    this.newPhase = null;
    this.phases = [];
    this.newLineCostCode = null;
    this.newLineDebit = null;
    this.newLineCredit = null;
    this.lines = [];
    this.allocationId = null;
    this.pieData = [];
  }
}
