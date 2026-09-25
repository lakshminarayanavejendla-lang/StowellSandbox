import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, StatusModel, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { CashFlowRecord } from '../../../core/models/project-management/cost-summary.model';

// Port of Components/Pages/ProjectManagement/CashFlowReport.razor + CasFlowReport.cs
// (@page "/CashFlowReport/{ProjectId:int}" - note the source filename typo, "CasFlowReport.cs").
//
// FLAG - route addition: not one of the five original stub routes; added as
// 'project-management/cash-flow-report/:projectId' (opened via target="_blank" links from the
// Reporting tab and Financials tab elsewhere in this module). Please splice into app.routes.ts.
//
// FLAG - exports: "Copy to clipboard" and "Export CSV" are ported natively (Clipboard API /
// Blob download - zero new dependencies). "Export PDF" and "Export Excel" used iTextSharp/
// ClosedXML server-side in Blazor; doing this client-side needs a new library (jsPDF/SheetJS)
// that hasn't been confirmed for this project (see HANDOFF.md's free-libraries-only stance) -
// left as disabled buttons pending that decision, rather than silently adding a dependency.
@Component({
  selector: 'app-cash-flow-report',
  standalone: true,
  imports: [CommonModule, FormsModule, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './cash-flow-report.component.html',
  styleUrl: './cash-flow-report.component.scss',
})
export class CashFlowReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private costCodeService = inject(ProjectCostCodeService);
  // FIX (2026-09-23, Mike Smith - "Cash Flow Report need to focus on current project when selected
  // from Report tab... I cannot find my project in here the way it is now"): loaded data wasn't
  // re-rendered (dropdowns stayed empty) - render after each load, as the Current Cost Summary does.
  private cdr = inject(ChangeDetectorRef);

  projectId = 0;
  statusModels: StatusModel[] = [];
  jobsModel: CostCodeRecord[] = [];
  selectedStatusId?: number;
  selectedJobId?: number;
  startDate = '';
  endDate = '';

  records: CashFlowRecord[] = [];
  filteredRecords: CashFlowRecord[] = [];
  searchTerm = '';
  pageSettings = { pageSize: 15, pageSizes: [10, 15, 20, 50] };

  recJobNumber = recJobNumber;

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId')) || 0;
    this.selectedJobId = this.projectId;

    const today = new Date();
    this.startDate = `${today.getFullYear()}-01-01`;
    this.endDate = today.toISOString().slice(0, 10);

    this.costCodeService.getAllStatusesData().subscribe((statuses) => {
      this.statusModels = statuses;
      this.selectedStatusId = 4; // "current", matching CasFlowReport.cs's hardcoded default
      this.cdr.detectChanges();
      this.costCodeService.getAllUserJobsByStatus(4).subscribe((jobs) => {
        this.jobsModel = jobs;
        this.ensureProjectInJobs();
        this.cdr.detectChanges();
      });
    });

    if (this.projectId > 0) {
      this.loadData();
    }
  }

  /** The Job dropdown is filtered by status (default "current"), so a project opened from its
   * Reporting tab could be missing from it and impossible to find. Make sure the project passed in
   * is in the list (and selected), looked up by number from the full job list if the status filter
   * left it out. */
  private ensureProjectInJobs(): void {
    if (!this.projectId || this.jobsModel.some((j) => j.recNum === this.projectId)) return;
    this.costCodeService.getJobCodesForReport().subscribe((all) => {
      const job = all.find((j) => String(j.recnum) === String(this.projectId));
      if (job) {
        this.jobsModel = [{ recNum: this.projectId, jobNumber: job.jobName }, ...this.jobsModel];
        this.selectedJobId = this.projectId;
        this.cdr.detectChanges();
      }
    });
  }

  onStatusChanged(statusId: number): void {
    this.selectedStatusId = statusId;
    this.costCodeService.getAllUserJobsByStatus(statusId).subscribe((jobs) => {
      this.jobsModel = jobs;
      if (!jobs.length) this.selectedJobId = 0;
      this.ensureProjectInJobs();
      this.cdr.detectChanges();
    });
  }

  getReportData(): void {
    if (this.selectedJobId) this.loadData(this.selectedJobId);
  }

  private loadData(jobId = this.projectId): void {
    this.costCodeService
      .cashFlowAllDataByPeriod({ recnum: String(jobId), startDate: this.startDate, endDate: this.endDate })
      .subscribe((records) => {
        this.records = records;
        this.applyFilter();
        this.cdr.detectChanges();
      });
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredRecords = !term
      ? this.records
      : this.records.filter((r) => [String(r.recNum), r.jobNumber].some((f) => f?.toLowerCase().includes(term)));
  }

  copyToClipboard(): void {
    const header = 'Rec Num\tJob Number\tCash Collected\tCash Paid\tNet Cash\tInvoice J2D\tA/R End Balance Today\tJob Costs To Date\tA/P End Balance Today\tCash Paid Out\tNet Cash In/Out';
    const rows = this.filteredRecords.map((r) =>
      [r.recNum, r.jobNumber, r.cashCollected, r.cashPaid, r.netCash, r.invoiceJ2D, r.a_REndBal_Today, r.jobcoststodate, r.a_PEndBal_Today, r.cashPaidOut, r.netCashInOut].join('\t')
    );
    navigator.clipboard?.writeText([header, ...rows].join('\n'));
  }

  exportCsv(): void {
    const header = 'Rec Num,Job Number,Cash Collected,Cash Paid,Net Cash,Invoice J2D,A/R End Balance Today,Job Costs To Date,A/P End Balance Today,Cash Paid Out,Net Cash In/Out';
    const rows = this.filteredRecords.map((r) =>
      [r.recNum, r.jobNumber, r.cashCollected, r.cashPaid, r.netCash, r.invoiceJ2D, r.a_REndBal_Today, r.jobcoststodate, r.a_PEndBal_Today, r.cashPaidOut, r.netCashInOut]
        .map((v) => `"${v}"`)
        .join(',')
    );
    this.downloadCsv([header, ...rows].join('\n'), 'CashFlowReport.csv');
  }

  private downloadCsv(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
