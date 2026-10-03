import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CurrentCostSummaryViewModel, CostCodeSummaryRecord } from '../../../core/models/project-management/cost-summary.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// The Cost Code Summary (/CostCodeSummary/{ProjectId:int} in Blazor; the file is spelled
// CashCodeSummary.razor).
//
// Its route, 'project-management/cost-code-summary/:projectId', is new. Copy and CSV work; PDF and
// Excel need a library that isn't approved yet, as on the Cash Flow Report.
@Component({
  selector: 'app-cost-code-summary',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './cost-code-summary.component.html',
  styleUrl: './cost-code-summary.component.scss',
})
export class CostCodeSummaryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private costCodeService = inject(ProjectCostCodeService);
  // The Job, Phase and summary data loaded into `model`, but the page never re-rendered, so the
  // dropdowns and boxes stayed empty (Mike Smith, 2026-09-23: "Phase not showing in Current Cost Code
  // Summary report"). It now renders after each load, like the other pages (see po-tab.component.ts).
  private cdr = inject(ChangeDetectorRef);

  projectId = 0;
  selectedProjectId = '';
  selectedCostCodes: string[] = [];
  selectedPhaseId = '';
  startDate = '';
  endDate = '';

  model: CurrentCostSummaryViewModel = { selectedJobId: '', selectedJobName: '', jobs: [], costCodes: [], phases: [] };
  filteredJobs: CostCodeSummaryRecord[] = [];
  searchTerm = '';
  pageSettings = { pageSize: 15, pageSizes: [10, 15, 20, 50] };

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId')) || 0;
    this.selectedProjectId = String(this.projectId);
    this.loadInitial();
  }

  private loadInitial(): void {
    this.costCodeService.getJobCodesForReport().subscribe((jobs) => {
      this.model.jobs = jobs;
      this.cdr.detectChanges();
    });
    this.costCodeService.getCostCodesForReport(this.selectedProjectId).subscribe((codes) => {
      this.model.costCodes = codes;
      this.selectedCostCodes = codes.map((c) => c.description);
      this.cdr.detectChanges();
    });
    this.costCodeService.getPhasesForReport(this.selectedProjectId).subscribe((phases) => {
      this.model.phases = phases;
      this.cdr.detectChanges();
    });
    this.costCodeService.getCurrentCostSummaryViewModel(this.selectedProjectId).subscribe((m) => {
      this.mergeSummary(m);
      this.appliedPhaseLabel = 'All phases';
      this.setRows(this.withPhase(m.costCodeSummaryModel?.costCodeSummary ?? []));
    });
  }


  /** Adds a summary response to the model without letting empty lists wipe ones already loaded (a failed call returns empty lists). */
  private mergeSummary(m: CurrentCostSummaryViewModel): void {
    this.model = {
      ...this.model,
      ...m,
      jobs: m.jobs?.length ? m.jobs : this.model.jobs,
      costCodes: m.costCodes?.length ? m.costCodes : this.model.costCodes,
      phases: m.phases?.length ? m.phases : this.model.phases,
    };
  }

  private setRows(rows: CostCodeSummaryRecord[]): void {
    this.filteredJobs = rows;
    this.cdr.detectChanges();
  }

  // The grid has a Phase column (Mike Smith, 2026-09-23). SPCostSummary returns one row per cost code
  // for the phase filter (phase 0, "None", means no filter), so the column shows the phase the rows
  // were run for, or "All phases" when none was picked.
  private appliedPhaseLabel = 'All phases';

  private currentPhaseLabel(): string {
    const p = this.model.phases?.find((x) => String(x.phaseNum) === this.selectedPhaseId);
    return this.selectedPhaseId && p ? `${p.phaseNum} - ${p.phaseName}` : 'All phases';
  }

  private withPhase(rows: CostCodeSummaryRecord[]): CostCodeSummaryRecord[] {
    return rows.map((r) => ({ ...r, phase: this.appliedPhaseLabel }));
  }

  onJobChanged(value: string): void {
    this.selectedProjectId = value;
    this.selectedPhaseId = '';
    this.costCodeService.getCostCodesForReport(value).subscribe((codes) => {
      this.model.costCodes = codes;
      this.selectedCostCodes = codes.map((c) => c.description);
      this.cdr.detectChanges();
    });
    this.costCodeService.getPhasesForReport(value).subscribe((phases) => {
      this.model.phases = phases;
      this.cdr.detectChanges();
    });
  }

  onSubmit(): void {
    const label = this.currentPhaseLabel();
    this.costCodeService
      .getCurrentCostSummaryViewModel(this.selectedProjectId, this.selectedCostCodes, this.selectedPhaseId, this.startDate, this.endDate)
      .subscribe((m) => {
        this.mergeSummary(m);
        this.appliedPhaseLabel = label;
        this.setRows(this.withPhase(m.costCodeSummaryModel?.costCodeSummary ?? []));
      });
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    const all = this.withPhase(this.model.costCodeSummaryModel?.costCodeSummary ?? []);
    const t = term.trim().toLowerCase();
    this.setRows(
      !t
        ? all
        : all.filter((j) => [j.jobNumber, j.costCode, j.costCodeDescription].some((f) => f?.toLowerCase().includes(t)))
    );
  }

  copyToClipboard(): void {
    const header = 'Job Number\tPhase\tCost Code\tCost Code Description\tBudget & Changes\tTo Date\tThis Period\tOpen POs\tRemaining';
    const rows = this.filteredJobs.map((r) =>
      [r.jobNumber, r.phase, r.costCode, r.costCodeDescription, r.budgetAndChanges, r.toDate, r.thisPeriod, r.committed ?? 0, r.remaining].join('\t')
    );
    navigator.clipboard?.writeText([header, ...rows].join('\n'));
  }

  exportCsv(): void {
    const header = 'Job Number,Phase,Cost Code,Cost Code Description,Budget & Changes,To Date,This Period,Open POs,Remaining';
    const rows = this.filteredJobs.map((r) =>
      [r.jobNumber, r.phase, r.costCode, r.costCodeDescription, r.budgetAndChanges, r.toDate, r.thisPeriod, r.committed ?? 0, r.remaining]
        .map((v) => `"${v}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CostCodeSummaryReport.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
