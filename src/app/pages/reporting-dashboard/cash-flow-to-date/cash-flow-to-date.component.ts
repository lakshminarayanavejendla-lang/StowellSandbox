import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, StatusModel, recJobNumber, recNumber } from '../../../core/models/project-management/cost-code.model';
import { CashFlowRecord } from '../../../core/models/project-management/cost-summary.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * Cash Flow To Date for several jobs (/CashFlowToDate in Blazor, CashFlowToDateMultiple.razor).
 *
 * Unlike Project Management's Cash Flow Report (one job, status 4 "current" by default), this lets
 * you pick several jobs, starts with no status, and calls CashFlowAllDataByMulitpleJobsAndPeriod.
 * The "Mulitple" typo is the server's, kept as is. The chosen jobs' rec numbers are joined with
 * commas into the single `recnum` string, as in OnJobNumberChange.
 *
 * PDF, Excel and Word export work (see report-export.util.ts).
 */
@Component({
  selector: 'app-cash-flow-to-date',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, GridModule],
  providers: [SortService, PdfExportService, ExcelExportService],
  templateUrl: './cash-flow-to-date.component.html',
  styleUrl: './cash-flow-to-date.component.scss',
})
export class CashFlowToDateComponent implements OnInit {
  @ViewChild('cashFlowToDateGrid') cashFlowToDateGrid!: GridComponent;

  private costCodeService = inject(ProjectCostCodeService);

  statusModels: StatusModel[] = [];
  jobsModel: CostCodeRecord[] = [];
  selectedStatusId = '';
  selectedJobIds: string[] = [];
  startDate = '';
  endDate = '';

  records: CashFlowRecord[] = [];
  filteredRecords: CashFlowRecord[] = [];
  searchTerm = '';

  recJobNumber = recJobNumber;
  recNumber = recNumber;

  ngOnInit(): void {
    const today = new Date();
    this.startDate = `${today.getFullYear()}-01-01`;
    this.endDate = today.toISOString().slice(0, 10);

    this.costCodeService.getAllStatusesData().subscribe((statuses) => (this.statusModels = statuses));
  }

  onStatusChanged(value: string): void {
    this.selectedStatusId = value;
    if (!value) {
      this.jobsModel = [];
      this.selectedJobIds = [];
      return;
    }
    this.costCodeService.getAllUserJobsByStatus(Number(value)).subscribe((jobs) => {
      this.jobsModel = jobs;
      if (!jobs.length) this.selectedJobIds = [];
    });
  }

  getReportData(): void {
    if (!this.selectedJobIds.length) return;
    this.costCodeService
      .cashFlowAllDataByMultipleJobsAndPeriod({
        recnum: this.selectedJobIds.join(','),
        startDate: this.startDate,
        endDate: this.endDate,
      })
      .subscribe((records) => {
        this.records = records;
        this.applyFilter();
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
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CashFlowToDate.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!this.cashFlowToDateGrid || !this.filteredRecords.length) return;
    exportGridPdf(this.cashFlowToDateGrid, 'CashFlowToDate.pdf');
  }

  exportExcel(): void {
    if (!this.cashFlowToDateGrid || !this.filteredRecords.length) return;
    exportGridExcel(this.cashFlowToDateGrid, 'CashFlowToDate.xlsx');
  }

  exportWord(): void {
    if (!this.filteredRecords.length) return;
    const headers = ['Rec Num', 'Job Number', 'Cash Collected', 'Cash Paid', 'Net Cash', 'Invoice J2D', 'A/R End Balance Today', 'Job Costs To Date', 'A/P End Balance Today', 'Cash Paid Out', 'Net Cash In/Out'];
    const rows = this.filteredRecords.map((r) => [r.recNum, r.jobNumber, r.cashCollected, r.cashPaid, r.netCash, r.invoiceJ2D, r.a_REndBal_Today, r.jobcoststodate, r.a_PEndBal_Today, r.cashPaidOut, r.netCashInOut]);
    exportWordTable('Cash Flow To Date', headers, rows, 'CashFlowToDate.doc');
  }
}
