import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, recJobNumber } from '../../../core/models/project-management/cost-code.model';
import { InvoicePayment } from '../../../core/models/project-management/cost-summary.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';

/**
 * Port of Components/Pages/ReportingDashboard/ARInvoiceList.razor + ARInvoiceListBase.cs
 * (@page "/ARInvoiceList"). Job dropdown (ICostCodeService.GetAllUserJobs, no email in the
 * C# call signature - see ProjectCostCodeService.getAllUserJobs()'s own header note re: the
 * server resolving the email from ClaimsPrincipal) feeds ICostCodeService.GetARInvoice(jobNumber),
 * already ported as ProjectCostCodeService.getARInvoice.
 *
 * FIX - PDF/Excel/Word export: previously disabled with a stale "needs a client-side library"
 * message - see report-export.util.ts's header comment for why that was wrong (Syncfusion's
 * grid package already provides PDF/Excel export natively) and how Word export works here.
 *
 * FLAG - likely source bug, reproduced as-is: the Blazor grid's "Invoice#" column is bound to
 * `item.JobName` and its "Job" column is bound to `item.InvNum` - the two look swapped versus
 * what their headers say. Reproduced exactly (same header/field pairing) rather than silently
 * "fixed", per this project's convention of flagging rather than correcting suspected upstream
 * bugs without confirmation - see HANDOFF.md's Bids module flags for the same pattern.
 * This swap carries over unchanged into the Syncfusion Grid below (still `field="jobName"` under
 * the "Invoice#" header, `field="invNum"` under "Job") - do NOT "fix" this while swapping grid
 * libraries, per the task instructions.
 */
@Component({
  selector: 'app-ar-invoice-list',
  standalone: true,
  imports: [CommonModule, FormsModule, GridModule],
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
