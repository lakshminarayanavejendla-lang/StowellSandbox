import { ChangeDetectorRef, Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, PageService, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CurrentCostSummaryViewModel, CostCodeSummaryRecord } from '../../../core/models/project-management/cost-summary.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * The Cost Code Summary report (/CostCodeSummaryReport in Blazor; the file is spelled
 * CashCodeSummaryReport.razor).
 *
 * It looks like Project Management's CostCodeSummaryComponent: both use the same service methods
 * and grid. The difference is that this one starts with no job, and the user picks one, while
 * Project Management's always opens with a job. They're kept as two components to match the two
 * Blazor pages; merge them if keeping both becomes a pain.
 *
 * PDF, Excel and Word export work (see report-export.util.ts).
 */
@Component({
  selector: 'app-cost-code-summary-report',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, GridModule],
  // The old table had no paging, so paging stays off to keep one flat list. Sorting was added.
  providers: [PageService, SortService, PdfExportService, ExcelExportService],
  templateUrl: './cost-code-summary-report.component.html',
  styleUrl: './cost-code-summary-report.component.scss',
})
export class CostCodeSummaryReportComponent implements OnInit {
  @ViewChild('costCodeSummaryGrid') costCodeSummaryGrid!: GridComponent;

  private costCodeService = inject(ProjectCostCodeService);
  // The loaded data wasn't re-rendered, so the Job and Phase dropdowns stayed empty. Render after
  // each load, as in project-management/cost-code-summary (Mike Smith, 2026-09-23: "Phase not showing").
  private cdr = inject(ChangeDetectorRef);

  selectedProjectId = '';
  selectedCostCodes: string[] = [];
  selectedPhaseId = '';
  startDate = '';
  endDate = '';

  model: CurrentCostSummaryViewModel = { selectedJobId: '', selectedJobName: '', jobs: [], costCodes: [], phases: [] };
  filteredJobs: CostCodeSummaryRecord[] = [];
  searchTerm = '';

  ngOnInit(): void {
    this.costCodeService.getJobCodesForReport().subscribe((jobs) => {
      this.model.jobs = jobs;
      this.cdr.detectChanges();
    });
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
    this.onSubmit();
  }

  // The Phase column (Mike Smith, 2026-09-23). It shows the filter's phase, not a per-row value; see
  // project-management/cost-code-summary.
  private appliedPhaseLabel = 'All phases';

  private currentPhaseLabel(): string {
    const p = this.model.phases?.find((x) => String(x.phaseNum) === this.selectedPhaseId);
    return this.selectedPhaseId && p ? `${p.phaseNum} - ${p.phaseName}` : 'All phases';
  }

  private withPhase(rows: CostCodeSummaryRecord[]): CostCodeSummaryRecord[] {
    return rows.map((r) => ({ ...r, phase: this.appliedPhaseLabel }));
  }

  onSubmit(): void {
    const label = this.currentPhaseLabel();
    this.costCodeService
      .getCurrentCostSummaryViewModel(this.selectedProjectId, this.selectedCostCodes, this.selectedPhaseId, this.startDate, this.endDate)
      .subscribe((m) => {
        this.model = { ...this.model, ...m };
        this.appliedPhaseLabel = label;
        this.filteredJobs = this.withPhase(m.costCodeSummaryModel?.costCodeSummary ?? []);
        this.cdr.detectChanges();
      });
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    const all = this.withPhase(this.model.costCodeSummaryModel?.costCodeSummary ?? []);
    const t = term.trim().toLowerCase();
    this.filteredJobs = !t
      ? all
      : all.filter((j) => [j.jobNumber, j.costCode, j.costCodeDescription].some((f) => f?.toLowerCase().includes(t)));
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

  exportPdf(): void {
    if (!this.costCodeSummaryGrid || !this.filteredJobs.length) return;
    exportGridPdf(this.costCodeSummaryGrid, 'CostCodeSummaryReport.pdf');
  }

  exportExcel(): void {
    if (!this.costCodeSummaryGrid || !this.filteredJobs.length) return;
    exportGridExcel(this.costCodeSummaryGrid, 'CostCodeSummaryReport.xlsx');
  }

  exportWord(): void {
    if (!this.filteredJobs.length) return;
    const headers = ['Job Number', 'Phase', 'Cost Code', 'Cost Code Description', 'Budget & Changes', 'To Date', 'This Period', 'Open POs', 'Remaining'];
    const rows = this.filteredJobs.map((r) => [r.jobNumber, r.phase, r.costCode, r.costCodeDescription, r.budgetAndChanges, r.toDate, r.thisPeriod, r.committed ?? 0, r.remaining]);
    exportWordTable('Cost Code Summary Report', headers, rows, 'CostCodeSummaryReport.doc');
  }
}
