import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { ContractSummary } from '../../../core/models/project-management/cost-summary.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';

/**
 * Port of Components/Pages/ReportingDashboard/ContractSummary.razor + ContractSummaryBase.cs
 * (@page "/ContractSummary"). Job dropdown (GetAllUserJobs) feeds
 * ICostCodeService.GetContractSummaryData(jobNumber), already ported as
 * ProjectCostCodeService.getContractSummaryData.
 *
 * FLAG - three grid columns ("Balance With Tax", "Retained", "Net Due With Tax") are hardcoded
 * to "$0.00" literals in the Blazor source, not bound to any field on ContractSummary - there's
 * no server-computed tax/retention value coming back at all. Reproduced as static $0.00 cells
 * rather than inventing a computation; confirm with the backend whether these were meant to be
 * wired up or are dead/placeholder columns.
 *
 * FIX - PDF/Excel/Word export: previously disabled with a stale "needs a client-side library"
 * message - see report-export.util.ts's header comment.
 *
 * The Syncfusion Grid below still hardcodes "$0.00" for those same three columns (via a static
 * ng-template, not a bound field) - carried over unchanged, not fixed, per the task instructions.
 */
@Component({
  selector: 'app-contract-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, GridModule],
  providers: [SortService, PdfExportService, ExcelExportService],
  templateUrl: './contract-summary.component.html',
  styleUrl: './contract-summary.component.scss',
})
export class ContractSummaryComponent implements OnInit {
  @ViewChild('contractSummaryGrid') contractSummaryGrid!: GridComponent;

  private costCodeService = inject(ProjectCostCodeService);

  costCodeRecords: CostCodeRecord[] = [];
  selectedProjectId = '';
  jobs: ContractSummary[] = [];
  filteredJobs: ContractSummary[] = [];
  searchTerm = '';
  recJobNumber = recJobNumber;

  ngOnInit(): void {
    this.costCodeService.getAllUserJobs().subscribe((jobs) => (this.costCodeRecords = jobs));
  }

  onJobChanged(value: string): void {
    this.selectedProjectId = value;
    this.costCodeService.getContractSummaryData(value).subscribe((rows) => {
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
    this.filteredJobs = !t ? this.jobs : this.jobs.filter((r) => r.jobName?.toLowerCase().includes(t));
  }

  copyToClipboard(): void {
    const header = 'Original Contract\tChanges To Date\tNew Contract\tInvoiced To Date\tBalance on Contract\tBalance With Tax\tRetained\tNet Due With Tax';
    const rows = this.filteredJobs.map((r) =>
      [r.originalContractAmount, r.changesToDate, r.newContract, r.invoicedToDate, r.balanceOnContract, 0, 0, 0].join('\t')
    );
    navigator.clipboard?.writeText([header, ...rows].join('\n'));
  }

  exportCsv(): void {
    const header = 'Original Contract,Changes To Date,New Contract,Invoiced To Date,Balance on Contract,Balance With Tax,Retained,Net Due With Tax';
    const rows = this.filteredJobs.map((r) =>
      [r.originalContractAmount, r.changesToDate, r.newContract, r.invoicedToDate, r.balanceOnContract, 0, 0, 0]
        .map((v) => `"${v}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ContractSummary.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!this.contractSummaryGrid || !this.filteredJobs.length) return;
    exportGridPdf(this.contractSummaryGrid, 'ContractSummary.pdf');
  }

  exportExcel(): void {
    if (!this.contractSummaryGrid || !this.filteredJobs.length) return;
    exportGridExcel(this.contractSummaryGrid, 'ContractSummary.xlsx');
  }

  exportWord(): void {
    if (!this.filteredJobs.length) return;
    const headers = ['Original Contract', 'Changes To Date', 'New Contract', 'Invoiced To Date', 'Balance on Contract', 'Balance With Tax', 'Retained', 'Net Due With Tax'];
    const rows = this.filteredJobs.map((r) => [r.originalContractAmount, r.changesToDate, r.newContract, r.invoicedToDate, r.balanceOnContract, 0, 0, 0]);
    exportWordTable('Contract Summary Report', headers, rows, 'ContractSummary.doc');
  }
}
