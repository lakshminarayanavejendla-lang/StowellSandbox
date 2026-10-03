import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ReportingService } from '../../../core/services/reporting.service';
import { CashFlowForecastRow } from '../../../core/models/project-management/cash-flow-query.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * The Cash Flow Forecast report (/CashFlowForecast in Blazor). It's the only report here that uses
 * ReportingService (see cash-flow-query.model.ts for the response).
 *
 * Two Syncfusion grids come from one response: Cash Flow Budget (BudgetForecast, shown as Budget
 * Amount / Costs As Of / Remaining) and Cash Flow Contract (ContractForecast, the same three fields
 * shown as Total Contract Amount / Billed As Of / Remaining). Each grid also gets a column per month,
 * taken from its first row's ForecastMonths keys, because the server decides the months.
 *
 * The month columns use templates that call monthValue(), not field="forecastMonths.Jan 2026",
 * because labels like "Jan 2026" have spaces and the grid's dotted field lookup may not handle them.
 *
 * PDF, Excel and Word export work (see report-export.util.ts). With two grids there are two
 * @ViewChild refs and two sets of export methods, one for budget and one for contract.
 */
@Component({
  selector: 'app-cash-flow-forecast',
  standalone: true,
  imports: [PageHeaderComponent, CommonModule, FormsModule, GridModule],
  providers: [SortService, PdfExportService, ExcelExportService],
  templateUrl: './cash-flow-forecast.component.html',
  styleUrl: './cash-flow-forecast.component.scss',
})
export class CashFlowForecastComponent implements OnInit {
  @ViewChild('budgetForecastGrid') budgetForecastGrid!: GridComponent;
  @ViewChild('contractForecastGrid') contractForecastGrid!: GridComponent;

  private reportingService = inject(ReportingService);

  budgetForecast: CashFlowForecastRow[] = [];
  contractForecast: CashFlowForecastRow[] = [];
  filteredBudgetForecast: CashFlowForecastRow[] = [];
  filteredContractForecast: CashFlowForecastRow[] = [];
  monthColumnsBudget: string[] = [];
  monthColumnsContract: string[] = [];
  searchTermBudget = '';
  searchTermContract = '';

  ngOnInit(): void {
    this.reportingService.getCashFlowForecastReportData().subscribe((data) => {
      if (!data) return;
      this.budgetForecast = data.budgetForecast ?? [];
      this.contractForecast = data.contractForecast ?? [];
      this.filteredBudgetForecast = this.budgetForecast;
      this.filteredContractForecast = this.contractForecast;
      this.monthColumnsBudget = Object.keys(this.budgetForecast[0]?.forecastMonths ?? {});
      this.monthColumnsContract = Object.keys(this.contractForecast[0]?.forecastMonths ?? {});
    });
  }

  onSearchChangeBudget(term: string): void {
    this.searchTermBudget = term;
    const t = term.trim().toLowerCase();
    this.filteredBudgetForecast = !t
      ? this.budgetForecast
      : this.budgetForecast.filter((r) => [r.jobNumber, r.jobName].some((f) => f?.toLowerCase().includes(t)));
  }

  // Used by the month column templates; same as the old template's `(r.forecastMonths[m] ?? 0)`.
  monthValue(row: CashFlowForecastRow, month: string): number {
    return row.forecastMonths[month] ?? 0;
  }

  onSearchChangeContract(term: string): void {
    this.searchTermContract = term;
    const t = term.trim().toLowerCase();
    this.filteredContractForecast = !t
      ? this.contractForecast
      : this.contractForecast.filter((r) => [r.jobNumber, r.jobName].some((f) => f?.toLowerCase().includes(t)));
  }

  private buildCsv(rows: CashFlowForecastRow[], months: string[], amountLabel: string, currentLabel: string): string {
    const header = ['Job Number', 'Job Name', amountLabel, currentLabel, 'Remaining', ...months].join(',');
    const body = rows.map((r) =>
      [r.jobNumber, r.jobName, r.totalAmount, r.currentAmount, r.remaining, ...months.map((m) => r.forecastMonths[m] ?? 0)]
        .map((v) => `"${v}"`)
        .join(',')
    );
    return [header, ...body].join('\n');
  }

  private download(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyBudgetToClipboard(): void {
    navigator.clipboard?.writeText(this.buildCsv(this.filteredBudgetForecast, this.monthColumnsBudget, 'Budget Amount', 'Costs As Of'));
  }

  exportBudgetCsv(): void {
    this.download(this.buildCsv(this.filteredBudgetForecast, this.monthColumnsBudget, 'Budget Amount', 'Costs As Of'), 'CashFlowForecastBudget.csv');
  }

  copyContractToClipboard(): void {
    navigator.clipboard?.writeText(
      this.buildCsv(this.filteredContractForecast, this.monthColumnsContract, 'Total Contract Amount', 'Billed As Of')
    );
  }

  exportContractCsv(): void {
    this.download(
      this.buildCsv(this.filteredContractForecast, this.monthColumnsContract, 'Total Contract Amount', 'Billed As Of'),
      'CashFlowForecastContract.csv'
    );
  }

  exportBudgetPdf(): void {
    if (!this.budgetForecastGrid || !this.filteredBudgetForecast.length) return;
    exportGridPdf(this.budgetForecastGrid, 'CashFlowForecastBudget.pdf');
  }

  exportBudgetExcel(): void {
    if (!this.budgetForecastGrid || !this.filteredBudgetForecast.length) return;
    exportGridExcel(this.budgetForecastGrid, 'CashFlowForecastBudget.xlsx');
  }

  exportBudgetWord(): void {
    if (!this.filteredBudgetForecast.length) return;
    const headers = ['Job Number', 'Job Name', 'Budget Amount', 'Costs As Of', 'Remaining', ...this.monthColumnsBudget];
    const rows = this.filteredBudgetForecast.map((r) => [
      r.jobNumber,
      r.jobName,
      r.totalAmount,
      r.currentAmount,
      r.remaining,
      ...this.monthColumnsBudget.map((m) => this.monthValue(r, m)),
    ]);
    exportWordTable('Cash Flow Forecast - Budget', headers, rows, 'CashFlowForecastBudget.doc');
  }

  exportContractPdf(): void {
    if (!this.contractForecastGrid || !this.filteredContractForecast.length) return;
    exportGridPdf(this.contractForecastGrid, 'CashFlowForecastContract.pdf');
  }

  exportContractExcel(): void {
    if (!this.contractForecastGrid || !this.filteredContractForecast.length) return;
    exportGridExcel(this.contractForecastGrid, 'CashFlowForecastContract.xlsx');
  }

  exportContractWord(): void {
    if (!this.filteredContractForecast.length) return;
    const headers = ['Job Number', 'Job Name', 'Total Contract Amount', 'Billed As Of', 'Remaining', ...this.monthColumnsContract];
    const rows = this.filteredContractForecast.map((r) => [
      r.jobNumber,
      r.jobName,
      r.totalAmount,
      r.currentAmount,
      r.remaining,
      ...this.monthColumnsContract.map((m) => this.monthValue(r, m)),
    ]);
    exportWordTable('Cash Flow Forecast - Contract', headers, rows, 'CashFlowForecastContract.doc');
  }
}
