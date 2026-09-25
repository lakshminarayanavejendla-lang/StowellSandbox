import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridComponent, SortService, PdfExportService, ExcelExportService } from '@syncfusion/ej2-angular-grids';
import { ReportingService } from '../../../core/services/reporting.service';
import { CashFlowForecastRow } from '../../../core/models/project-management/cash-flow-query.model';
import { exportGridPdf, exportGridExcel, exportWordTable } from '../../../core/utils/report-export.util';

/**
 * Port of Components/Pages/ReportingDashboard/CashFlowForecast.razor +
 * CashFlowForecastBase.razor.cs (@page "/CashFlowForecast"). This is the one page in this
 * whole module backed by IReportingService (ReportingService.getCashFlowForecastReportData) -
 * see that service's header comment and core/models/project-management/cash-flow-query.model.ts's
 * updated header comment for how CashFlowForecastResponse's real shape was confirmed against
 * Models/CostCodeList.cs during this phase.
 *
 * Two grids, both fed from the one response: "Cash Flow Budget" (BudgetForecast, columns
 * labeled "Budget Amount"/"Costs As Of"/"Remaining") and "Cash Flow Contract" (ContractForecast,
 * same three underlying fields labeled "Total Contract Amount"/"Billed As Of"/"Remaining"),
 * plus a set of dynamic month columns per grid built from that grid's first row's
 * ForecastMonths keys - reproduced the same way (columns computed from data instead of a fixed
 * column list, since the month range is server-driven).
 *
 * FIX - PDF/Excel/Word export: previously disabled with a stale "needs a client-side library"
 * message - see report-export.util.ts's header comment. Two independent grids here means two
 * independent #ref/@ViewChild pairs and two sets of export methods (budget/contract).
 *
 * No Chart.js chart to swap here - despite the class comment above mentioning "two grids", this
 * page really is grid-only in the source; checked for a canvas/chart import and found none.
 * Syncfusion GridComponent replaces both plain <table>s. The month columns are still built
 * dynamically off each grid's own `forecastMonths` keys (server-driven month range, unchanged) -
 * rendered via per-column templates calling `monthValue()` rather than a dot-path `field` string,
 * since month labels like "Jan 2026" contain spaces and this project isn't 100% certain how
 * Syncfusion Grid 27.1.x's nested-field dot-notation lookup handles that - flagging that as the
 * reason for the template-based approach instead of `field="forecastMonths.Jan 2026"`.
 */
@Component({
  selector: 'app-cash-flow-forecast',
  standalone: true,
  imports: [CommonModule, FormsModule, GridModule],
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

  // Helper for the dynamic month e-column templates - equivalent to the original template's
  // `(r.forecastMonths[m] ?? 0)`.
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
