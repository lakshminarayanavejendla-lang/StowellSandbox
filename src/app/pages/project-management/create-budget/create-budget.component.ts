import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { ProjectBudgetService } from '../../../core/services/project-budget.service';
import { CostCodeRecord, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { Phase } from '../../../core/models/project-management/cost-summary.model';
import { BudgetRecord } from '../../../core/models/project-management/project-budget.model';
import { CostCodeList } from '../../../core/models/accounting/cost-code.model';
import { AccountingService } from '../../../core/services/accounting.service';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// Create and Modify Budget, from CreateBudget.razor (/ProjectBudgetConfiguration/{Action}/{ProjectId:int}).
//
// The route 'project-budget-configuration/:action/:projectId' is new; only the bare
// 'project-budget-configuration' had a placeholder. Action is "CreateBudget" or "ModifyBudget" and
// decides which fields can be edited and which service call runs.
//
// Excel upload: Blazor read the .xlsx on the server with NPOI, then posted the rows through
// UploadAddExcelAsync(List<BudgetRecord>). (The overload that takes the file directly was never
// used.) The browser can't do that without a library such as SheetJS, which hasn't been approved,
// so this shows the file picker but doesn't read the file. Add the library once it's approved, or
// add an API endpoint that takes the raw file so the server keeps doing the parsing.
@Component({
  selector: 'app-create-budget',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './create-budget.component.html',
  styleUrl: './create-budget.component.scss',
})
export class CreateBudgetComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private costCodeService = inject(ProjectCostCodeService);
  private budgetService = inject(ProjectBudgetService);
  private _accountingService = inject(AccountingService);
  private authService = inject(AuthService);

  // This used to send a dummy email ('pcsadmin@phoenixcanopyshades.com') as the user on every
  // request. sp_BudgetTran needs @User to be a real StowellUsers row, so every approval threw "User
  // not found in StowellUsers.", and sp_ApproveBudgetTransaction rolled back the whole batch for that
  // job and phase. Nothing reached Sage, so the Budget, PO, CO and Invoices tabs never showed the
  // initial budget (Mike Smith, 2026-09-16). It now sends the signed-in user, like the rest of the module.
  private get placeholderEmail(): string {
    return this.authService.getLoggedInUserEmail() ?? 'pcsadmin@phoenixcanopyshades.com';
  }

  filteredCostCodeDescriptions: CostCodeList[] = [];
activeRow: FormGroup | null = null;
private hideAutocompleteTimeout: any;

  action = 'CreateBudget';
  projectId = 0;

  costCodeRecords: CostCodeRecord[] = [];
  phases: Phase[] = [];
  selectedProjectId = 0;
  selectedPhaseId = '';

  rows = this.fb.array<FormGroup>([]);
  isSaving = false;
  isSubmitDisabled = true;
  saveError = '';
  saveSuccess='';
  private successMessageTimeout: any;
  selectedFile: File | null = null;

  // "After initial budget is set, no one can change it - all changes come through Change Orders. The
  // user can click into budget but if it's been set already all they can do is view the initial
  // budget or create an initial budget for an added phase." (Mike Smith, 2026-09-26.) So on a job
  // that already has a Sage budget (ModifyBudget), a phase with a budget is view-only, and a phase
  // with no budget yet (an added phase) works like Create Budget for that phase.
  phaseCreateMode = false;

  get isCreate(): boolean {
    return this.action === 'CreateBudget' || this.phaseCreateMode;
  }

  /** The selected phase already has an initial budget. It's shown but can't be changed here, only through change orders. */
  get isViewOnly(): boolean {
    return !this.isCreate && this.selectedPhaseId !== '' && this.rows.length > 0;
  }

  recJobNumber = recJobNumber;
ngOnInit(): void {
  this.action =
    this.route.snapshot.paramMap.get('action') ?? 'CreateBudget';

  this.projectId =
    Number(this.route.snapshot.paramMap.get('projectId')) || 0;

  this.selectedProjectId = this.projectId;

  // Load Job Numbers
  this.costCodeService.getAllUserJobs().subscribe({
    next: (jobs) => {
      console.log('Jobs from API:', jobs);

      this.costCodeRecords = (jobs ?? []).map(job => ({
        ...job,
        recNum: Number(job.recNum)
      }));

      console.log('Normalized jobs:', this.costCodeRecords);
      console.log('Selected project:', this.selectedProjectId);

      // Set the selected value after the jobs load.
      const projectExists = this.costCodeRecords.some(
        job => Number(job.recNum) === this.selectedProjectId
      );

      if (projectExists) {
        this.selectedProjectId = this.projectId;
      } else {
        this.selectedProjectId = 0;
      }

      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error loading Job Numbers:', error);
      this.costCodeRecords = [];
      this.selectedProjectId = 0;
    }
  });

  // Load phases
  if (this.projectId > 0) {
    this.costCodeService.getJobPhasesData(this.projectId).subscribe({
      next: (phases) => {
        this.phases = phases ?? [];

        this.selectedPhaseId =
          this.phases.length > 0
            ? this.phases[0].phaseNum
            : '';

        this.loadBudgetData();

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading phases:', error);
        this.phases = [];
        this.selectedPhaseId = '';
      }
    });
  }
}

  private loadBudgetData(): void {
  if (this.selectedProjectId <= 0 || !this.selectedPhaseId) {
    return;
  }

  const phase: Phase = {
    recnum: String(this.selectedProjectId),
    phaseNum: this.selectedPhaseId,
    phaseName:
      this.phases.find(
        p => p.phaseNum === this.selectedPhaseId
      )?.phaseName ?? '',
    source: this.action === 'CreateBudget' ? 'Local' : 'Sage',
  };

  this.budgetService.budgetData(phase).subscribe({
    next: (records) => {
      // On a job that already has a budget, a phase with no budget lines is an added phase, so the user
      // can create its initial budget. A phase with budget lines is locked (see isViewOnly).
      this.phaseCreateMode = this.action !== 'CreateBudget' && (records ?? []).length === 0;
      this.setRows(records ?? []);
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error loading budget data:', error);
      this.phaseCreateMode = false;
      this.rows.clear();
      this.cdr.detectChanges();
    }
  });
}
  private setRows(records: BudgetRecord[]): void {
    this.rows.clear();
    for (const r of records) {
      this.rows.push(
        this.fb.group({
          costCode: [r.costCode ?? ''],
          costCodeDescription: [r.costCodeDescription ?? ''],
          totalBudget: [r.totalBudget ?? null],
          updateBudget: [r.updateBudget ?? null],
        })
      );
    }
  }

   constructor(
  private cdr: ChangeDetectorRef,
  ) {}
onJobChanged(value: number): void {
  this.selectedProjectId = Number(value);

  console.log('Selected Job Number:', this.selectedProjectId);

  if (this.selectedProjectId <= 0) {
    this.phases = [];
    this.selectedPhaseId = '';
    this.phaseCreateMode = false;
    this.rows.clear();
    return;
  }

  this.costCodeService
    .getJobPhasesData(this.selectedProjectId)
    .subscribe({
      next: (phases) => {
        this.phases = phases ?? [];

        this.selectedPhaseId =
          this.phases.length > 0
            ? this.phases[0].phaseNum
            : '';

        this.loadBudgetData();

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading phases:', error);
        this.phases = [];
        this.selectedPhaseId = '';
        this.rows.clear();
      }
    });
}

  onPhaseChanged(value: string): void {
    this.selectedPhaseId = value;
    this.loadBudgetData();
  }

  addRow(): void {
    this.rows.push(this.fb.group({ costCode: [''], costCodeDescription: [''], totalBudget: [null], updateBudget: [null] }));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

private toRecords(): BudgetRecord[] {

  let controls = this.rows.controls;

  if (!this.isCreate) {
    controls = controls.filter((g) => {
      const updateBudget = g.get('updateBudget')?.value;

      return updateBudget !== null &&
             updateBudget !== undefined &&
             updateBudget !== '';
    });
  }

  return controls.map((g) => ({
    jobNumber: String(this.selectedProjectId),
    costCode: g.get('costCode')?.value,
    costCodeDescription: g.get('costCodeDescription')?.value,
    totalBudget: g.get('totalBudget')?.value,
    updateBudget: g.get('updateBudget')?.value,
    phaseNum: Number(this.selectedPhaseId) || 0,
    source: this.isCreate ? 'Local' : 'Sage',
    actionType: this.isCreate ? 'CreateBudget' : this.action,
    email: this.placeholderEmail
  }));
}

private hasInvalidRows(): boolean {

  if (this.isCreate) {
    // Create mode: every row needs a Cost Code Description and a Total Budget.
    return this.rows.controls.some((g) =>
      !g.get('costCodeDescription')?.value ||
      g.get('totalBudget')?.value == null
    );
  }

  // Modify mode: at least one Update Budget must be filled in.
  const rowsToUpdate = this.rows.controls.filter((g) => {
    const value = g.get('updateBudget')?.value;

    return value !== null &&
           value !== undefined &&
           value !== '';
  });

  // No rows selected for update
  if (rowsToUpdate.length === 0) {
    return true;
  }

  return false;
}


saveBudget(): void {

  if (this.isViewOnly) return; // initial budget is set - changes go through Change Orders

  if (this.hasInvalidRows()) {
    this.saveError = 'Please enter Cost Code and Budget for all rows.';
    this.saveSuccess = '';
    this.isSubmitDisabled = true;
    return;
  }

  this.saveError = '';
  this.saveSuccess = '';
  this.isSaving = true;

  this.budgetService.saveCreateBatchCostCodes(this.toRecords()).subscribe({
    next: (records) => {

      this.setRows(records);

      this.isSubmitDisabled = false;
      this.isSaving = false;

      this.saveSuccess = 'Saved Budget successfully!';

      if (this.successMessageTimeout) {
        clearTimeout(this.successMessageTimeout);
      }

      this.successMessageTimeout = setTimeout(() => {
        this.saveSuccess = '';
        this.cdr.detectChanges();
      }, 5000);

      this.cdr.detectChanges();
    },

    error: (error) => {
      console.error('Save error:', error);

      this.isSaving = false;
      this.saveSuccess = '';
      this.saveError = 'Failed to save budget. Please try again.';

      this.cdr.detectChanges();
    }
  });
}

submitBudget(): void {

  if (this.isViewOnly) return; // initial budget is set - changes go through Change Orders

  if (this.isCreate) {

    if (this.hasInvalidRows()) {
      this.saveError = 'Please enter Cost Code and Budget for all rows.';
      this.saveSuccess = '';
      this.isSubmitDisabled = true;
      return;
    }

  } else {

    const rowsToUpdate = this.rows.controls.filter((g) => {
      const value = g.get('updateBudget')?.value;

      return value !== null &&
             value !== undefined &&
             value !== '';
    });

    if (rowsToUpdate.length === 0) {
      this.saveError = 'Please enter Update Budget for at least one row.';
      this.saveSuccess = '';
      this.isSubmitDisabled = true;
      return;
    }
  }

  // Clear messages
  this.saveError = '';
  this.saveSuccess = '';
  this.isSaving = true;

  // toRecords() must return only the rows being updated.
  const records = this.toRecords();

  this.budgetService.submitBatchCostCodes(records).subscribe({
    next: (response) => {

      this.isSaving = false;
      this.isSubmitDisabled = false;

      this.saveSuccess = 'Budget submitted successfully!';

      this.cdr.detectChanges();

      setTimeout(() => {
        this.saveSuccess = '';
        this.cdr.detectChanges();
      }, 5000);
    },

    error: (error) => {
      console.error('Submit error:', error);

      this.isSaving = false;
      this.saveError = 'Failed to submit budget. Please try again.';
      this.saveSuccess = '';

      this.cdr.detectChanges();
    }
  });
}
onCostCodeDescriptionInput(
  event: Event,
  row: FormGroup
): void {
  const input = event.target as HTMLInputElement;
  const filter = input.value?.trim() || '';

  this.activeRow = row;

  if (!filter) {
    this.filteredCostCodeDescriptions = [];
    return;
  }

  this._accountingService.getCostCodes(filter).subscribe({
    next: (results: CostCodeList[]) => {
      this.filteredCostCodeDescriptions = results || [];
    },
    error: (error) => {
      console.error('Error loading cost code descriptions:', error);
      this.filteredCostCodeDescriptions = [];
    }
  });
}

onCostCodeDescriptionFocus(
  event: Event,
  row: FormGroup
): void {
  this.activeRow = row;

  const input = event.target as HTMLInputElement;
  const filter = input.value?.trim() || '';

  if (!filter) {
    this.filteredCostCodeDescriptions = [];
    return;
  }

  this._accountingService.getCostCodes(filter).subscribe({
    next: (results: CostCodeList[]) => {
      this.filteredCostCodeDescriptions = results || [];
    },
    error: () => {
      this.filteredCostCodeDescriptions = [];
    }
  });
}
selectCostCodeDescription(
  item: CostCodeList,
  row: FormGroup
): void {
  row.get('costCodeDescription')?.setValue(item.description);

  this.filteredCostCodeDescriptions = [];
  this.activeRow = null;
}
  

onCostCodeDescriptionBlur(): void {
  this.hideAutocompleteTimeout = setTimeout(() => {
    this.filteredCostCodeDescriptions = [];
    this.activeRow = null;
  }, 200);
}

// The budget columns show US dollars with commas, such as $1,500,000 (Mike Smith, 2026-09-16), which
// a type="number" input can't do. These inputs are type="text" with [value] instead of
// formControlName (see the template). This formats the control's number for display and turns
// typed text back into a plain number on every keystroke, so toRecords() and hasInvalidRows() still
// read a number, not a string with commas.
formatCurrency(value: number | string | null): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const num = typeof value === 'string' ? Number(value.replace(/,/g, '')) : value;
  return isNaN(num) ? '' : num.toLocaleString('en-US');
}

onBudgetInput(event: Event, row: FormGroup, controlName: string): void {
  const input = event.target as HTMLInputElement;
  const raw = input.value.replace(/,/g, '');
  const num = raw === '' ? null : Number(raw);
  row.get(controlName)?.setValue(isNaN(num as number) ? null : num);

  const formatted = this.formatCurrency(num);
  const caretFromEnd = input.value.length - (input.selectionStart ?? input.value.length);
  input.value = formatted;
  input.setSelectionRange(formatted.length - caretFromEnd, formatted.length - caretFromEnd);
}
}
