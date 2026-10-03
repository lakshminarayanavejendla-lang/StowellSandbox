import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  GridModule,
  GridComponent,
  SortService,
  ExcelExportService,
  PdfExportService
} from '@syncfusion/ej2-angular-grids';

import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { JobSummaryService } from '../../../core/services/job-summary.service';
import {
  CostCodeRecord,
  recJobNumber
} from '../../../core/models/project-management/cost-code.model';
import { CostCodeSummaryRecord } from '../../../core/models/project-management/cost-summary.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

@Component({
  selector: 'app-job-summary-report',
  standalone: true,

  imports: [PageHeaderComponent, 
    CommonModule,
    FormsModule,
    GridModule
  ],

  providers: [
    SortService,
    ExcelExportService,
    PdfExportService
  ],

  templateUrl: './job-summary-report.component.html',
  styleUrl: './job-summary-report.component.scss',
})
export class JobSummaryReportComponent implements OnInit {

  @ViewChild('jobSummaryGrid')
  public jobSummaryGrid!: GridComponent;

  private costCodeService = inject(ProjectCostCodeService);
  private jobSummaryService = inject(JobSummaryService);

  costCodeRecords: CostCodeRecord[] = [];
  selectedProjectId = '';

  jobs: CostCodeSummaryRecord[] = [];
  filteredJobs: CostCodeSummaryRecord[] = [];

  searchTerm = '';

  recJobNumber = recJobNumber;

  ngOnInit(): void {

    this.costCodeService
      .getAllUserJobs()
      .subscribe((jobs) => {
        this.costCodeRecords = jobs;
      });

    this.jobSummaryService
      .getJobCostSummaryRecords()
      .subscribe((rows) => {
        this.jobs = rows;
        this.applyFilter();
      });
  }

  onJobChanged(value: string): void {

    this.selectedProjectId = value;

    this.jobSummaryService
      .getJobCostSummaryRecords(value)
      .subscribe((rows) => {
        this.jobs = rows;
        this.applyFilter();
      });
  }

  onSearchChange(term: string): void {

    this.searchTerm = term;
    this.applyFilter();
  }

  private applyFilter(): void {

    const t = this.searchTerm.trim().toLowerCase();

    this.filteredJobs = !t
      ? this.jobs
      : this.jobs.filter((j) =>
          [
            j.jobNumber,
            j.costCode,
            j.costCodeDescription
          ].some((f) =>
            f?.toLowerCase().includes(t)
          )
        );
  }

  copyToClipboard(): void {

    const header =
      'Job Number\tCost Code\tCost Code Description\tBudget & Changes\tTo Date\tThis Period\tRemaining';

    const rows = this.filteredJobs.map((r) =>
      [
        r.jobNumber,
        r.costCode,
        r.costCodeDescription,
        r.budgetAndChanges,
        r.toDate,
        r.thisPeriod,
        r.remaining
      ].join('\t')
    );

    const text = [header, ...rows].join('\n');

    navigator.clipboard?.writeText(text).then(() => {
      alert(`Copied ${this.filteredJobs.length} rows to clipboard!`);
    });
  }

  exportCsv(): void {

    const header =
      'JobNumber,CostCode,CostCodeDescription,BudgetAndChanges,ToDate,ThisPeriod,Remaining';

    const rows = this.filteredJobs.map(
      (r) =>
        `"${r.jobNumber}","${r.costCode}","${r.costCodeDescription}",${r.budgetAndChanges},${r.toDate},${r.thisPeriod},${r.remaining}`
    );

    const blob = new Blob(
      [[header, ...rows].join('\n')],
      { type: 'text/csv' }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'JobSummaryReport.csv';
    a.click();

    URL.revokeObjectURL(url);
  }

  exportExcel(): void {

    if (!this.jobSummaryGrid || this.filteredJobs.length === 0) {
      alert('No job summary data available to export.');
      return;
    }

    exportGridExcel(this.jobSummaryGrid, 'JobSummaryReport.xlsx');
  }

  exportPdf(): void {

    if (!this.jobSummaryGrid || this.filteredJobs.length === 0) {
      alert('No job summary data available to export.');
      return;
    }

    exportGridPdf(this.jobSummaryGrid, 'JobSummaryReport.pdf');
  }

  exportWord(): void {

    if (this.filteredJobs.length === 0) {
      alert('No job summary data available to export.');
      return;
    }

    const headers = ['Job Number', 'Cost Code', 'Cost Code Description', 'Budget & Changes', 'To Date', 'This Period', 'Remaining'];
    const rows = this.filteredJobs.map((r) => [
      r.jobNumber,
      r.costCode,
      r.costCodeDescription,
      r.budgetAndChanges,
      r.toDate,
      r.thisPeriod,
      r.remaining
    ]);

    exportWordTable('Job Summary Report', headers, rows, 'JobSummaryReport.doc');
  }
}
