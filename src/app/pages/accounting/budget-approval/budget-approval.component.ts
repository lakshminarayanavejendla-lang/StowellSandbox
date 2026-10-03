import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AccountingService } from '../../../core/services/accounting.service';
import { CostCodeService } from '../../../core/services/cost-code.service';
import { BudgetRecord, CostCodeRecord, Phase } from '../../../core/models/accounting/budget.model';
import { CostCodeList } from '../../../core/models/accounting/cost-code.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

export type BudgetApprovalMode = 'new' | 'modify';

/**
 * One component for Approve New Budget and Approve Modify Budget.
 *
 * The two Blazor pages are copies of the same flow. The markup is identical, down to the element
 * ids. The code differs only in which method loads the grid (GetApproveBudgetData or
 * GetModifyBudgetData), and the modify page still calls its methods ApproveNewBudget() and
 * RejectNewBudget() from the copy. Both post to the same BudgetApproveRequest and
 * BudgetRejectRequest endpoints.
 *
 * So this is one component, with `mode` from the route data. If "new" and "modify" ever need to
 * behave differently, such as different approval permissions, check with the product owner. Nothing
 * in the code suggests they do now.
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
  private router = inject(Router);
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
      this.selectFirstPendingPhase(phases);
    });

    this.costCodeService.getAllUserJobs().subscribe((jobs) => (this.jobOptions = jobs));
  }

  /** In new-budget mode, opens on the first phase with budget lines waiting for approval (an added phase isn't the first), otherwise the first phase. */
  private selectFirstPendingPhase(phases: Phase[]): void {
    const fallback = phases.length ? phases[0].phaseNum : '0';
    const tryPhase = (i: number): void => {
      if (this.mode !== 'new' || i >= phases.length) {
        this.form.patchValue({ selectedPhaseId: fallback });
        this.loadBudgetData();
        return;
      }
      const p = phases[i];
      this.accountingService
        .getApproveBudgetData({ recnum: String(this.projectId), phaseName: p.phaseName, phaseNum: String(p.phaseNum) })
        .subscribe((rows) => {
          if (rows.length) {
            this.form.patchValue({ selectedPhaseId: p.phaseNum });
            this.loadBudgetData();
          } else {
            tryPhase(i + 1);
          }
        });
    };
    tryPhase(0);
  }

  onJobChanged(): void {
    this.loadBudgetData();
  }

  onPhaseChanged(): void {
    this.loadBudgetData();
  }

  // The cost code description autocomplete (RadzenAutoComplete's LoadData in Blazor). It's a text
  // input with a <datalist>, filtered on (input) with the current text.
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
    next: (res) => {
      this.isSaving = false;
      if (res && res.success === false) {
        // The service returns { success: false } on failure, not an error, so show the real reason instead of success.
        this.errorMessage = res.message || 'The accounting budget could not be processed.';
      } else {
        this.successMessage = successMessage;
        // It's been decided, so it's no longer in the queue.
        setTimeout(() => this.router.navigate(['/accounting']), 1200);
      }
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
