import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { PrimeChangeList } from '../../../core/models/project-management/cost-summary.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';

// Port of Components/Pages/ReportingDashboard/PrimeChangeList.razor + PrimeChangeListBase.cs
// (@page "/PrimeChangeList"). Job dropdown (GetAllUserJobs) feeds
// ICostCodeService.GetPrimeChangeList(jobNumber), already ported as
// ProjectCostCodeService.getPrimeChangeList.
//
// FIX - PDF/Excel/Word export: previously disabled with a stale "needs a client-side library"
// message - see report-export.util.ts's header comment.
@Component({
  selector: 'app-prime-change-list',
  standalone: true,
  imports: [CommonModule, FormsModule, GridModule],
  providers: [SortService, PdfExportService, ExcelExportService],
  templateUrl: './prime-change-list.component.html',
  styleUrl: './prime-change-list.component.scss',
})
export class PrimeChangeListComponent implements OnInit {
  @ViewChild('primeChangeGrid') primeChangeGrid!: GridComponent;

  private costCodeService = inject(ProjectCostCodeService);

  costCodeRecords: CostCodeRecord[] = [];
  selectedProjectId = '';
  jobs: PrimeChangeList[] = [];
  filteredJobs: PrimeChangeList[] = [];
  searchTerm = '';
  recJobNumber = recJobNumber;

  ngOnInit(): void {
    this.costCodeService.getAllUserJobs().subscribe((jobs) => (this.costCodeRecords = jobs));
  }

  onJobChanged(value: string): void {
    this.selectedProjectId = value;
    this.costCodeService.getPrimeChangeList(value).subscribe((rows) => {
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
      : this.jobs.filter((r) => [r.chgNum, r.description, r.status].some((f) => f?.toLowerCase().includes(t)));
  }

  copyToClipboard(): void {
    const header = 'Record#\tOrder#\tDate\tDescription\tStatus\tRequested\tApproved';
    const rows = this.filteredJobs.map((r) =>
      [r.recNum, r.chgNum, r.chgDate, r.description, r.status, r.reqAmt, r.appAmt].join('\t')
    );
    navigator.clipboard?.writeText([header, ...rows].join('\n'));
  }

  exportCsv(): void {
    const header = 'Record#,Order#,Date,Description,Status,Requested,Approved';
    const rows = this.filteredJobs.map((r) =>
      [r.recNum, r.chgNum, r.chgDate, r.description, r.status, r.reqAmt, r.appAmt].map((v) => `"${v}"`).join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PrimeChangeList.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!this.primeChangeGrid || !this.filteredJobs.length) return;
    exportGridPdf(this.primeChangeGrid, 'PrimeChangeList.pdf');
  }

  exportExcel(): void {
    if (!this.primeChangeGrid || !this.filteredJobs.length) return;
    exportGridExcel(this.primeChangeGrid, 'PrimeChangeList.xlsx');
  }

  exportWord(): void {
    if (!this.filteredJobs.length) return;
    const headers = ['Record#', 'Order#', 'Date', 'Description', 'Status', 'Requested', 'Approved'];
    const rows = this.filteredJobs.map((r) => [r.recNum, r.chgNum, r.chgDate, r.description, r.status, r.reqAmt, r.appAmt]);
    exportWordTable('Prime Change List', headers, rows, 'PrimeChangeList.doc');
  }
}
