import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { InvoiceReceivable } from '../../../core/models/project-management/cost-summary.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// Invoice Receivable (/InvoiceReceivable in Blazor). Pick a job (GetAllUserJobs) to see its
// receivables (getInvoiceReceivable).
//
// PDF, Excel and Word export work (see report-export.util.ts).
@Component({
  selector: 'app-invoice-receivable',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, GridModule],
  providers: [SortService, PdfExportService, ExcelExportService],
  templateUrl: './invoice-receivable.component.html',
  styleUrl: './invoice-receivable.component.scss',
})
export class InvoiceReceivableComponent implements OnInit {
  @ViewChild('invoiceReceivableGrid') invoiceReceivableGrid!: GridComponent;

  private costCodeService = inject(ProjectCostCodeService);

  costCodeRecords: CostCodeRecord[] = [];
  selectedProjectId = '';
  jobs: InvoiceReceivable[] = [];
  filteredJobs: InvoiceReceivable[] = [];
  searchTerm = '';
  recJobNumber = recJobNumber;

  ngOnInit(): void {
    this.costCodeService.getAllUserJobs().subscribe((jobs) => (this.costCodeRecords = jobs));
  }

  onJobChanged(value: string): void {
    this.selectedProjectId = value;
    this.costCodeService.getInvoiceReceivable(value).subscribe((rows) => {
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
      : this.jobs.filter((r) => [r.invNum, r.description].some((f) => f?.toLowerCase().includes(t)));
  }

  copyToClipboard(): void {
    const header = 'Record#\tInvoice#\tInvoice Date\tDescription\tDue Date\tRequested\tInvoice Total\tPaid\tDisc/Cred\tBalance\tRetention\tNet Due';
    const rows = this.filteredJobs.map((r) =>
      [r.recNum, r.invNum, r.invDate, r.description, r.dueDate, r.status, r.invTtl, r.amtPad, r.discCred, r.invBal, r.retain, r.invNet].join('\t')
    );
    navigator.clipboard?.writeText([header, ...rows].join('\n'));
  }

  exportCsv(): void {
    const header = 'Record#,Invoice#,Invoice Date,Description,Due Date,Requested,Invoice Total,Paid,Disc/Cred,Balance,Retention,Net Due';
    const rows = this.filteredJobs.map((r) =>
      [r.recNum, r.invNum, r.invDate, r.description, r.dueDate, r.status, r.invTtl, r.amtPad, r.discCred, r.invBal, r.retain, r.invNet]
        .map((v) => `"${v}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'InvoiceReceivable.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!this.invoiceReceivableGrid || !this.filteredJobs.length) return;
    exportGridPdf(this.invoiceReceivableGrid, 'InvoiceReceivable.pdf');
  }

  exportExcel(): void {
    if (!this.invoiceReceivableGrid || !this.filteredJobs.length) return;
    exportGridExcel(this.invoiceReceivableGrid, 'InvoiceReceivable.xlsx');
  }

  exportWord(): void {
    if (!this.filteredJobs.length) return;
    const headers = ['Record#', 'Invoice#', 'Invoice Date', 'Description', 'Due Date', 'Requested', 'Invoice Total', 'Paid', 'Disc/Cred', 'Balance', 'Retention', 'Net Due'];
    const rows = this.filteredJobs.map((r) => [r.recNum, r.invNum, r.invDate, r.description, r.dueDate, r.status, r.invTtl, r.amtPad, r.discCred, r.invBal, r.retain, r.invNet]);
    exportWordTable('Invoice Receivable', headers, rows, 'InvoiceReceivable.doc');
  }
}
