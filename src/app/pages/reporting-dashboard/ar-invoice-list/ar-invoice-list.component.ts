import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { InvoicePayment } from '../../../core/models/project-management/cost-summary.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * The AR Invoice List (/ARInvoiceList in Blazor). Pick a job (GetAllUserJobs) to see its invoices
 * (getARInvoice).
 *
 * PDF, Excel and Word export work (see report-export.util.ts).
 *
 * Probably a bug in Blazor, kept as is: the "Invoice#" column shows JobName and the "Job" column
 * shows InvNum, which look swapped. The grid keeps the same pairing (field="jobName" under Invoice#,
 * field="invNum" under Job). Don't change it without confirming.
 */
@Component({
  selector: 'app-ar-invoice-list',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, GridModule],
  providers: [SortService, PdfExportService, ExcelExportService],
  templateUrl: './ar-invoice-list.component.html',
  styleUrl: './ar-invoice-list.component.scss',
})
export class ArInvoiceListComponent implements OnInit {
  @ViewChild('arInvoiceGrid') arInvoiceGrid!: GridComponent;

  private costCodeService = inject(ProjectCostCodeService);

  costCodeRecords: CostCodeRecord[] = [];
  selectedProjectId = '';
  jobs: InvoicePayment[] = [];
  filteredJobs: InvoicePayment[] = [];
  searchTerm = '';
  recJobNumber = recJobNumber;

  ngOnInit(): void {
    this.costCodeService.getAllUserJobs().subscribe((jobs) => (this.costCodeRecords = jobs));
  }

  onJobChanged(value: string): void {
    this.selectedProjectId = value;
    this.costCodeService.getARInvoice(value).subscribe((rows) => {
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
      : this.jobs.filter((r) => [r.jobName, r.invNum].some((f) => f?.toLowerCase().includes(t)));
  }

  copyToClipboard(): void {
    const header = 'Record#\tInvoice#\tJob\tDate\tDue Date\tInvoice Total\tBalance';
    const rows = this.filteredJobs.map((r) =>
      [r.recNum, r.jobName, r.invNum, r.invDate, r.dueDate, r.invoiceTotal, r.balance].join('\t')
    );
    navigator.clipboard?.writeText([header, ...rows].join('\n'));
  }

  exportCsv(): void {
    const header = 'Record#,Invoice#,Job,Date,Due Date,Invoice Total,Balance';
    const rows = this.filteredJobs.map((r) =>
      [r.recNum, r.jobName, r.invNum, r.invDate, r.dueDate, r.invoiceTotal, r.balance].map((v) => `"${v}"`).join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ARInvoiceList.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!this.arInvoiceGrid || !this.filteredJobs.length) return;
    exportGridPdf(this.arInvoiceGrid, 'ARInvoiceList.pdf');
  }

  exportExcel(): void {
    if (!this.arInvoiceGrid || !this.filteredJobs.length) return;
    exportGridExcel(this.arInvoiceGrid, 'ARInvoiceList.xlsx');
  }

  exportWord(): void {
    if (!this.filteredJobs.length) return;
    const headers = ['Record#', 'Invoice#', 'Job', 'Date', 'Due Date', 'Invoice Total', 'Balance'];
    const rows = this.filteredJobs.map((r) => [r.recNum, r.jobName, r.invNum, r.invDate, r.dueDate, r.invoiceTotal, r.balance]);
    exportWordTable('AR Invoice List', headers, rows, 'ARInvoiceList.doc');
  }
}
