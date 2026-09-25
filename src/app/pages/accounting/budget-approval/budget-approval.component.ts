import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AccountingService } from '../../../core/services/accounting.service';
import { CostCodeService } from '../../../core/services/cost-code.service';
import { BudgetRecord, CostCodeRecord, Phase } from '../../../core/models/accounting/budget.model';
import { CostCodeList } from '../../../core/models/accounting/cost-code.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

export type BudgetApprovalMode = 'new' | 'modify';

/**
 * Shared port of Accounting/ApproveNewBudget(.razor/Base.cs) AND ApproveModifyBudget
 * (.razor/Base.cs).
 *
 * FINDING (per task instructions, flagging explicitly): these two Blazor pages are the same
 * flow duplicated by copy/paste, not two genuinely different UIs. Their .razor markup is
 * byte-for-byte identical (same job/phase dropdowns, same RadzenDataGrid + RadzenAutoComplete
 * cost-code grid, same Approve/Reject buttons - even the element ids "saveAllBtn"/"btnSubmit"
 * match) and their *Base.cs code-behind is identical apart from (a) which IAccountingService
 * method is called - GetApproveBudgetData vs GetModifyBudgetData - and (b) ApproveModifyBudgetBase
 * still calls its methods `ApproveNewBudget()`/`RejectNewBudget()` (leftover names from the
 * copy/paste, never renamed). There is no behavioral difference between "approve a new budget"
 * and "approve a modified budget" beyond which data-fetch endpoint feeds the grid - both post
 * to the exact same BudgetApproveRequest/BudgetRejectRequest endpoints.
 *
 * Consolidated here into one component driven by `mode` (route data), rather than two
 * near-identical Angular components. Confirm with product this consolidation is correct if the
 * underlying business meaning of "new" vs "modify" budgets ever needs to diverge (e.g.
 * different approval permissions) - nothing in the source code suggests it does today.
 */
@Component({
  selector: 'app-budget-approval',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './budget-approval.component.html',
  styleUrl: './budget-approval.component.scss',
})
export class BudgetApprovalComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private accountingService = inject(AccountingService);
  private costCodeService = inject(CostCodeService);
private cdr = inject(ChangeDetectorRef);
  mode: BudgetApprovalMode = 'new';
  projectId = 0;
 successMessage = '';
 errorMessage = '';
  jobOptions: CostCodeRecord[] = [];
  phaseOptions: Phase[] = [];
  costCodeDescriptions: CostCodeList[] = [];

  isSaving = false;

  form: FormGroup = this.fb.group({
    selectedProjectId: [0],
    selectedPhaseId: [''],
    budgetRows: this.fb.array([]),
  });

  get budgetRows(): FormArray {
    return this.form.get('budgetRows') as FormArray;
  }

  get selectedPhaseName(): string {
    const phaseId = this.form.get('selectedPhaseId')?.value;
    return this.phaseOptions.find((p) => p.phaseNum === phaseId)?.phaseName ?? '';
  }

  get pageTitle(): string {
    return this.mode === 'new' ? 'Accounting Budget Creation' : 'Accounting Budget Updation';
  }

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] as BudgetApprovalMode) ?? 'new';
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId')) || 0;
    this.form.patchValue({ selectedProjectId: this.projectId });

    this.costCodeService.getJobPhasesData(this.projectId).subscribe((phases) => {
      this.phaseOptions = phases;
      const firstPhaseId = phases.length ? phases[0].phaseNum : '0';
      this.form.patchValue({ selectedPhaseId: firstPhaseId });
      this.loadBudgetData();
    });

    this.costCodeService.getAllUserJobs().subscribe((jobs) => (this.jobOptions = jobs));
  }

  onJobChanged(): void {
    this.loadBudgetData();
  }

  onPhaseChanged(): void {
    this.loadBudgetData();
  }

  // Backs the cost-code-description autocomplete (RadzenAutoComplete's LoadData in the
  // source) - a plain text input + native <datalist> here since we're not using a paid grid
  // library. Fires on (input) with the current text as the filter.
  onCostCodeFilterChange(filter: string): void {
    this.accountingService.getCostCodes(filter ?? '').subscribe((list) => (this.costCodeDescriptions = list));
  }

approve(): void {
  this.runAction(
    (phase) => this.accountingService.budgetApproveRequest(phase),
    'Accounting Budget Approved Successfully'
  );
}

reject(): void {
  this.runAction(
    (phase) => this.accountingService.budgetRejectRequest(phase),
    'Accounting Budget Rejected Successfully'
  );
}

private runAction(
  action: (phase: Phase) => ReturnType<AccountingService['budgetApproveRequest']>,
  successMessage: string
): void {
  const projectId = this.form.get('selectedProjectId')?.value;
  const phaseId = this.form.get('selectedPhaseId')?.value;

  if (!(projectId > 0) || !phaseId) {
    return;
  }

  const phase: Phase = {
    recnum: String(projectId),
    phaseName: this.selectedPhaseName,
    phaseNum: String(phaseId),
  };

  this.isSaving = true;
  this.successMessage = '';
  this.errorMessage = '';

  action(phase).subscribe({
    next: () => {
      this.isSaving = false;
      this.successMessage = successMessage;
      this.cdr.detectChanges();
    },
    error: () => {
      this.isSaving = false;
      this.errorMessage = 'An error occurred while processing the accounting budget.';
      this.cdr.detectChanges();
    }
  });
}
  private loadBudgetData(): void {
    const projectId = this.form.get('selectedProjectId')?.value;
    const phaseId = this.form.get('selectedPhaseId')?.value;
    if (!(projectId > 0) || !phaseId) {
      return;
    }

    const phase: Phase = {
      recnum: String(projectId),
      phaseName: this.selectedPhaseName,
      phaseNum: String(phaseId),
    };

    const fetch$ = this.mode === 'new'
      ? this.accountingService.getApproveBudgetData(phase)
      : this.accountingService.getModifyBudgetData(phase);

    fetch$.subscribe((records) => this.setBudgetRows(records));
  }

  private setBudgetRows(records: BudgetRecord[]): void {
    this.budgetRows.clear();
    for (const record of records) {
      console.log('Adding budget row:', record);
      this.budgetRows.push(
        this.fb.group({
          costCodeDescription: [record.costCodeDescription],
          totalBudget: [{ value: record.totalBudget ?? null, disabled: true }],
        })
      );
      this.cdr.detectChanges(); // Ensure the UI updates after adding each row
    }
    
  }
}
