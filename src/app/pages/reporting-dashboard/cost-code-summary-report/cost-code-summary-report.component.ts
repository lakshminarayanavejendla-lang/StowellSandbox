import { ChangeDetectorRef, Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, PageService, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CurrentCostSummaryViewModel, CostCodeSummaryRecord } from '../../../core/models/project-management/cost-summary.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';

/**
 * Port of Components/Pages/ReportingDashboard/CashCodeSummaryReport.razor (source filename,
 * note the swapped letters vs "CostCodeSummaryReport") + CostCodeSummaryReportBase.cs
 * (@page "/CostCodeSummaryReport" - despite the file living in the ReportingDashboard folder,
 * its code-behind's C# namespace is `StowellCoApp.Components.Pages.ProjectManagement`, which
 * looks like a copy/paste leftover rather than a real module boundary; left as a data point,
 * not reproduced since Angular has no equivalent namespace concept).
 *
 * DUPLICATE-LOOKING BUT DISTINCT from Project Management's already-ported CostCodeSummaryComponent
 * (pages/project-management/cost-code-summary, route 'project-management/cost-code-summary/:projectId'):
 * both call the exact same ICostCodeService methods (GetJobCodesForReport, GetCostCodesForReport,
 * GetPhasesForReport, GetCurrentCostSummaryViewModel) and render the same grid - the only
 * difference is this one is a standalone route with no required job id (Model starts blank,
 * user must pick a job from the dropdown), while the Project Management one is always opened
 * with a job id already selected. Kept as two components (not one shared component fed by an
 * optional route param) to mirror the two distinct Blazor pages/routes 1:1; consider merging
 * later if that duplication becomes a maintenance problem.
 *
 * FIX - PDF/Excel/Word export: previously disabled with a stale "needs a client-side library"
 * message - see report-export.util.ts's header comment.
 */
@Component({
  selector: 'app-cost-code-summary-report',
  standalone: true,
  imports: [CommonModule, FormsModule, GridModule],
  // PageService/SortService: this report's plain table never paginated or sorted, so paging is
  // left off (allowPaging unset) to preserve the original "everything in one flat list" behavior
  // - only SortService is wired up as a low-risk, purely-additive Grid feature.
  providers: [PageService, SortService, PdfExportService, ExcelExportService],
  templateUrl: './cost-code-summary-report.component.html',
  styleUrl: './cost-code-summary-report.component.scss',
})
export class CostCodeSummaryReportComponent implements OnInit {
  @ViewChild('costCodeSummaryGrid') costCodeSummaryGrid!: GridComponent;

  private costCodeService = inject(ProjectCostCodeService);
  // FIX (2026-09-23, Mike Smith - "Phase not showing") - same as project-management/cost-code-summary:
  // loaded data wasn't re-rendered, leaving the Job/Phase dropdowns empty. Render after each load.
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

  // NEW (2026-09-23, Mike Smith - "Phase not showing") - Phase column; see
  // project-management/cost-code-summary for why it's the filter's phase, not a per-row value.
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
