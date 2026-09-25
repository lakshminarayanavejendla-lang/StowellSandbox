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

// Port of Components/Pages/ProjectManagement/CreateBudget.razor + CreateBudgetBase.cs
// (@page "/ProjectBudgetConfiguration/{Action}/{ProjectId:int}").
//
// FLAG - route addition: this path was NOT one of the five original stub routes handed to this
// phase (only bare 'project-budget-configuration' was stubbed). The Blazor source clearly needs
// the {Action}/{ProjectId} segments (Action is "CreateBudget" or "ModifyBudget", driving both
// which fields are editable and which service call happens) - added as
// 'project-budget-configuration/:action/:projectId'. Please splice this into app.routes.ts too.
//
// FLAG - Excel upload: the source parses the uploaded .xlsx with NPOI (server-side, since this
// runs in Blazor Server) before posting parsed rows via IProjectBudget.UploadAddExcelAsync
// (List<BudgetRecord> overload - the source's other overload, taking MultipartFormDataContent
// directly, is defined but never actually called from this page, so it's dead code here too).
// A browser SPA has no server-side XLSX parser; this component exposes the file picker but
// does NOT parse it client-side, since that requires adding a new npm dependency (e.g.
// SheetJS/xlsx) that hasn't been confirmed/installed for this project. Wire this up once that
// library choice is signed off, or add a raw-file upload endpoint so the API keeps doing the
// parsing (closer to today's architecture).
@Component({
  selector: 'app-create-budget',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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

  // FIX (2026-09-16, Mike Smith - Initial Budget submitted but Budget/PO/CO/Invoices tabs never
  // showed it, even after the Sage auto-approve + sp_BudgetTran fixes) - this hardcoded placeholder
  // ('pcsadmin@phoenixcanopyshades.com', an unrelated dummy tenant's address) was sent as the
  // submitting user's email on every request. sp_BudgetTran requires @User to resolve to a real
  // row in StowellUsers - since this placeholder never did, every approve attempt for a batch
  // containing it threw "User not found in StowellUsers." internally, which sp_ApproveBudgetTransaction
  // catches and rolls back the WHOLE transaction (all cost codes in that job/phase), not just this
  // field - so nothing in the batch ever posted to Sage, confirmed live via direct testing. Now uses
  // the actual signed-in user, same as the rest of this module.
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

  get isCreate(): boolean {
    return this.action === 'CreateBudget';
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

      // Set selected value AFTER jobs are loaded
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
    source: this.isCreate ? 'Local' : 'Sage',
  };

  this.budgetService.budgetData(phase).subscribe({
    next: (records) => {
      this.setRows(records ?? []);
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error loading budget data:', error);
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
    actionType: this.action,
    email: this.placeholderEmail
  }));
}

private hasInvalidRows(): boolean {

  if (this.isCreate) {
    // Create mode:
    // Every row must have Cost Code Description and Total Budget
    return this.rows.controls.some((g) =>
      !g.get('costCodeDescription')?.value ||
      g.get('totalBudget')?.value == null
    );
  }

  // Modify mode:
  // At least one Update Budget must be entered
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

  // IMPORTANT:
  // toRecords() should return only the rows being updated
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

// FIX (2026-09-16, Mike Smith - "not showing like US $ ie. $1,500,000") - the budget columns are
// plain number inputs, which can't display thousands separators (browsers reject non-digit
// characters in type="number"). These format the FormControl's raw numeric value for display
// (type="text" input, driven by [value] instead of formControlName - see the template) and parse
// typed text back into a clean number on every keystroke, so toRecords()/hasInvalidRows() still
// read a plain number from the FormControl, not a comma-containing string.
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
