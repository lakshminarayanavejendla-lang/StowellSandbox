import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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

interface PieSlice {
  label: string;
  value: number;
}

/**
 * UPDATED page - client-updated Moqups, page FORM-CO Reallocation (link shared 2026-09-13).
 * Replaces the earlier two-mode (Debit/Credit) split with one unified "Change Order Budget
 * Allocation" form: every cost code in the Budget Update grid can carry both a Debit and a
 * Credit on the same line via "Add Line", rather than picking a single source cost code first.
 *
 * CO Type (Prime/Internal) drives numbering and mandatory fields (confirmed 2026-09-14):
 *   - Prime: system-assigned "BC" + year + 4-digit sequence (e.g. BC20260001). Also adds
 *     Requested Amount / Approved Amount as additional mandatory + active fields (greyed out
 *     for Internal) - enforced both here and server-side in CO_SubmitBudgetReallocation.
 *   - Internal: system-assigned "CO" + year + sequence (e.g. CO20260001).
 *   CO Number is NOT user-editable for either type - see onCoTypeChange()'s comment: it's shown
 *   as a live preview as soon as CO Type is picked (not left blank until Submit), but the real
 *   number is always freshly generated and collision-checked server-side at Submit time.
 *   Sequence is global per prefix+year, not job-scoped.
 *
 * FLAG - Save/Submit write to new app-owned tables (dbo.CoBudgetAllocations/-Phases/-Lines in
 * SAGESBQ), not StowellSandbox's real prmchg/bdglin - this deliberately does not post against
 * real Sage budget/CO records yet. Confirm before wiring this to touch real Sage data.
 */
@Component({
  selector: 'app-co-budget-allocation',
  standalone: true,
  imports: [CommonModule, FormsModule, AccumulationChartModule, UsdInputDirective],
  providers: [PieSeriesService, AccumulationLegendService, AccumulationTooltipService, AccumulationDataLabelService],
  templateUrl: './co-budget-allocation.component.html',
  styleUrl: './co-budget-allocation.component.scss',
})
export class CoBudgetAllocationComponent implements OnInit {
  private route = inject(ActivatedRoute);
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

  // CHANGED (2026-09-20, Mike Smith - "these dropdowns should be from stowellsandbox"): these two
  // lists are now loaded from StowellSandbox in ngOnInit (CoBudgetAllocationService.getLookups -
  // statuses from Sage's chgtyp table, reasons from the reasons already used on real change orders).
  // The literals below are only a fallback for when that call fails, so the form never shows empty
  // dropdowns.
  coReasonOptions: string[] = ['Owner Request', 'Field Condition', 'Design Change', 'Budget Rebalance', 'Other'];
  // Moqups FORM-CO Reallocation: "CO Status must match Sage / Pull from Sage100 CO Status /
  // MANDATORY and blank to force user input". Filled from Sage's change types (chgtyp) by
  // getLookups() below; deliberately NO hardcoded fallback list, so a value that isn't in Sage can
  // never be offered (it was ['Draft','Pending','Approved','Rejected'], none of which exist in Sage).
  coStatusOptions: string[] = [];

  // NEW (2026-09-20, Mike Smith - "I need to be able to see all cost codes in the dropdown") - the
  // full cost code catalog, so the Budget Update "Cost Code" picker isn't limited to codes the job
  // already has a budget line for. Empty until loaded/if the call fails (the picker then falls back
  // to the job's own cost codes, as before).
  allCostCodes: { costCode: number; costCodeDescription: string }[] = [];

  // NEW (2026-09-20) - once the user types their own Requested/Approved Amount (Prime only), stop
  // overwriting those fields with the Budget Update running total (see updatePieData()).
  amountsEdited = false;

  // NEW - Phase is now a dropdown scoped to the selected job's real Sage phases (see
  // JobPhaseService), not free text. `phases` (the added/chip list) is unchanged.
  availablePhases: JobPhaseOption[] = [];
  newPhase: number | null = null;
  phases: string[] = [];

  newLineCostCode: number | null = null;
  newLineDebit: number | null = null;
  newLineCredit: number | null = null;
  lines: CoBudgetLine[] = [];

  statusMessage = '';

  // NEW - edit-on-click for an already-saved/submitted allocation (see
  // project-management.routes.ts's 'co-budget-allocation/:allocationId' /
  // 'co-budget-reallocation/:allocationId' routes and CoBudgetAllocationService.getById).
  allocationId: number | null = null;

  pieData: PieSlice[] = [];
  readonly pieColors = ['#0479CC', '#f4b8ac', '#7cb342', '#ffb300', '#8e24aa', '#00838f'];
  legendSettings = { visible: true, position: 'Bottom' as const };

  get isPrime(): boolean {
    return this.coType === 'Prime';
  }

  // NAMING NOTE (Mike Smith, 2026-09-24 - "need debits to subtract and credits to add", "would it be easier to just
  // change column headings ... seems like they are just switched"): the stored/posted fields keep their original
  // meaning - `debit` is the amount that is ADDED to the cost code's budget, `credit` the amount that is DEDUCTED
  // (CO_SubmitBudgetReallocation / CO_PostBudgetAllocationToSage, and every allocation already saved). The screen
  // shows them swapped: the column headed "Credit" edits `debit` (adds), the column headed "Debit" edits `credit`
  // (subtracts). So Budget Change Total = added - deducted = debit - credit, as before.
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


    const idParam = this.route.snapshot.paramMap.get('allocationId');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isNaN(id)) this.loadForEdit(id);
  }

  /** NEW - see this file's allocationId field comment. */
  private loadForEdit(id: number): void {
    this.allocationId = id;
    this.allocationService.getById(id).subscribe((detail) => {
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
      // Ledger-style grid: shows exactly the lines this allocation actually saved, not every
      // cost code the job has (see onJobChange()'s matching comment).
      this.lines = [...detail.lines];
      // The saved Requested/Approved/Profit values are authoritative when re-opening an
      // allocation - don't let updatePieData() re-derive them from the lines.
      this.amountsEdited = true;
      // A saved reason/status that isn't in the loaded lists still has to show up in its dropdown.
      if (this.coReason && !this.coReasonOptions.includes(this.coReason)) this.coReasonOptions = [...this.coReasonOptions, this.coReason];
      if (this.coStatus && !this.coStatusOptions.includes(this.coStatus)) this.coStatusOptions = [...this.coStatusOptions, this.coStatus];
      this.updatePieData();

      // Loads cost codes for the Budget Update grid's "Item" picker without going through
      // onJobChange() - that method also recomputes overallBudget from the job's live cost
      // codes, which would clobber the allocation's own saved OverallBudget/ProfitOnSell here.
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
    this.phaseBudgets = null;
    if (!recNum) return;

    this.loadPhaseBudgets(recNum);

    this.jobCostCodeService.getJobCostCodes(recNum).subscribe((codes) => {
      this.costCodes = codes.map((c) => ({ ...c, display: `${c.costCode} - ${c.costCodeDescription}` }));
      this.overallBudget = this.costCodes.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
      this.cdr.detectChanges();
    });

    this.jobPhaseService.getJobPhases(recNum).subscribe((phases) => {
      this.availablePhases = phases;
      this.cdr.detectChanges();
    });

    this.loadAllCostCodes(recNum);
  }

  // --- Pre-submit phase check (2026-09-24, Mike Smith - "Submit failed ... 500" on an Internal allocation) --------------------
  // Submit posts the allocation to the job's real Sage budget lines (CO_PostBudgetAllocationToSage) under the FIRST phase chosen, and the
  // server refuses (HTTP 500, nothing saved) when (1) a cost code has a net DEDUCTION but no budget line under that phase, or (2) any
  // cost code would end up below zero. Both are checked here first, so the user is told which cost code and phase to fix instead of
  // getting a failed submit. `phaseBudgets` = each cost code's current budget per phase; null when it could not be loaded (then the
  // check is skipped and the server still enforces the rules).
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

  /** Net budget change per cost code (`debit` field adds, `credit` field deducts - the convention CO_PostBudgetAllocationToSage
   * uses; the screen labels them the other way round, see the naming note on budgetChangeTotal). */
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

  /** Problems that would make Submit fail on the server, in plain words. Empty = fine (or not checkable yet). */
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

  /** One phase that holds the budget of every cost code that failed the "no budget under this phase" rule, if there is one. */
  get suggestedPhase(): number | null {
    const phase = this.postingPhase;
    if (this.phaseBudgets === null || phase === null) return null;

    // (explicit cast: TypeScript would otherwise narrow `common` to plain `null` and reject the loop below)
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
      this.allCostCodes = codes;
      this.cdr.detectChanges();
    });
  }

  /** Remaining Budget column for a manually-added Budget Update row. */
  remainingForCode(costCode: string): number {
    return this.costCodes.find((c) => String(c.costCode) === costCode)?.remaining ?? 0;
  }

  /** NEW - populates CO Number automatically as soon as CO Type is picked, instead of leaving it
   * blank until Submit. Always readonly/system-generated (both Prime and Internal) - not user-
   * editable. This is a DISPLAY-ONLY preview, not a reservation (see
   * CoBudgetAllocationService.getNextNumber's comment): two users picking the same CO Type at the
   * same time can see the identical preview, so buildPayload() deliberately does NOT send this
   * value at Submit time - the real number is always freshly (re)computed and collision-checked
   * under lock server-side. Sending the preview as a literal override would skip that check and
   * could let two concurrent submissions land the same CoNumber. */
  onCoTypeChange(coType: CoBudgetAllocationType): void {
    this.coType = coType;
    this.recalcProfitOnSell();
    if (!coType) return;

    this.allocationService.getNextNumber(coType).subscribe((preview) => {
      if (preview) this.coNumber = preview;
      this.cdr.detectChanges();
    });
  }

  /** FIX (2026-09-23, Mike Smith - "Cannot submit - missing: Phase" with 0-None selected): picking a
   * phase adds it to the phase list immediately (Submit validates that list, not this dropdown). */
  onPhasePicked(phaseNumber: number | null): void {
    this.newPhase = phaseNumber;
    if (phaseNumber !== null) this.addPhase();
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

  /** Excludes phases already added to the chip list, so this picker can't create a duplicate. */
  get availablePhasesForNewPhase(): JobPhaseOption[] {
    return this.availablePhases.filter((p) => !this.phases.includes(`${p.phaseNumber} - ${p.phaseName}`));
  }

  onLineCostCodeSelected(costCode: number | null): void {
    this.newLineCostCode = costCode;
  }

  /** Every cost code (full catalog when it loaded, otherwise just the job's own budget lines),
   * excluding codes already added as a Budget Update row so this picker can't create a second,
   * duplicate row for the same cost code. Showing the whole catalog is what lets one code be
   * debited and a different one - even one the job hasn't budgeted yet - be credited. */
  get availableCostCodesForNewLine(): { costCode: number; costCodeDescription: string }[] {
    // The catalog also holds ~60 job-specific codes (e.g. 12162402.104, created per job); those are
    // only offered when they belong to the selected job, so other jobs' codes don't clutter the list.
    return this.pickerCodes.filter((c) => !this.lines.some((l) => l.costCode === String(c.costCode)));
  }

  /** FIX (2026-09-24, Mike Smith - allocation on job 10120): the catalog offers each cost code in this job's
   * own numbering (10120.103 for "1012 - GC - Employee Housing"), but older jobs keep their budget under the
   * plain code (1012.000) - so picking it made a line with no budget ("no budget on this job at all"), and an
   * addition would have created a brand-new cost code. Where the job already has a budget line under the plain
   * code (the number at the start of the catalog description) that code is used, with the job's own
   * description; codes the job budgets under its own numbering (12162402.104 ...) are left as they are.
   * Job cost codes missing from the catalog are still offered. */
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

  /** Public - also called from the template when a Budget Update row's Debit/Credit changes.
   * Filters out untouched rows (0/0) so an edited-then-zeroed line doesn't leave a
   * meaningless 0-value slice in the chart. Also keeps Requested/Approved Amount in sync with
   * the running total (see their [value] bindings in the template) - they're readonly computed
   * displays, not manually typed, so the underlying fields buildPayload() actually sends must be
   * updated here too, not just what's shown on screen. */
  updatePieData(): void {
    this.pieData = this.lines
      .filter((l) => (Number(l.debit) || 0) !== 0 || (Number(l.credit) || 0) !== 0)
      .map((l) => ({
        label: `${l.costCode} - ${l.costCodeDescription}`,
        value: (Number(l.debit) || 0) + (Number(l.credit) || 0),
      }));

    // Requested/Approved Amount default to the running total until the user types their own
    // (Prime only - see onAmountEdited()); after that they are left alone.
    if (!this.amountsEdited) {
      this.requestedAmount = this.budgetChangeTotal;
      this.approvedAmount = this.budgetChangeTotal;
    }
    this.recalcProfitOnSell();
  }

  /** NEW (2026-09-20, Mike Smith - "need to be able to edit Requested amount and Approved Amount.
   * That way Profit on sell will work") - Requested/Approved Amount are now typed inputs for a
   * Prime CO. Marks them user-edited so updatePieData() stops overwriting them, and refreshes
   * Profit on Sell. */
  onAmountEdited(): void {
    this.amountsEdited = true;
    this.recalcProfitOnSell();
  }

  /** Profit on Sell (Prime only), per the Moqups FORM-CO Reallocation comment (Warren Hampton):
   *   = (Total Approved Amount - Budget Change Total) / Total Approved Amount
   * i.e. a MARGIN PERCENTAGE, not a dollar amount (the earlier version showed the dollar difference,
   * "Profit on Sell formula appears wrong" - Mike Smith 2026-09-22). Budget Change Total is
   * the total the lines add to the budget (see budgetChangeTotal). With no approved amount the
   * margin is undefined, so it shows 0. Internal COs have no approved amount, so Profit on Sell
   * stays a manual entry there. Stored/shown as a percentage number, e.g. 35 = 35%. */
  private recalcProfitOnSell(): void {
    if (!this.isPrime) return;
    const approved = Number(this.approvedAmount) || 0;
    this.profitOnSell = approved > 0 ? Math.round(((approved - this.budgetChangeTotal) / approved) * 10000) / 100 : 0;
  }

  private buildPayload(): CoBudgetAllocationSubmission {
    return {
      // NEW - coNumber is always blank here on purpose - see onCoTypeChange()'s comment. The
      // displayed value is a live preview only; sending it as a literal override would bypass
      // the server's own lock + collision check and could let two concurrent submissions land
      // the same CoNumber.
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
        this.statusMessage = `CO budget allocation submitted (${result.coNumber}).`;
        this.resetForm();
      } else {
        this.statusMessage = `Submit failed: ${result.error ?? 'unknown error'}`;
      }
      this.cdr.detectChanges();
    });
  }

  /** NEW (2026-09-20) - deletes the allocation currently open for editing. A submitted allocation's
   * effect on the real budget lines is reversed server-side, so this asks first. */
  deleteAllocation(): void {
    if (this.allocationId == null) return;
    const ok = window.confirm(
      `Delete change order allocation ${this.coNumber || this.allocationId}? If it was submitted, its budget changes will be reversed on the job's budget lines.`
    );
    if (!ok) return;

    this.allocationService.delete(this.allocationId, this.authService.getLoggedInUserEmail() ?? 'Unknown User').subscribe((result) => {
      if (result.deleted) {
        this.statusMessage = 'CO budget allocation deleted.';
        this.resetForm();
      } else {
        this.statusMessage = `Delete failed: ${result.error ?? 'unknown error'}`;
      }
      this.cdr.detectChanges();
    });
  }

  /** Clears the form back to its ngOnInit state after a successful submit, so the page is ready
   * for the next allocation instead of showing the just-submitted one. Leaves `jobs` (the job
   * picker list) and `statusMessage` (the success message just set by submit()) untouched. */
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
