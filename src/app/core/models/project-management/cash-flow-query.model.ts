// Matches CashFlowQueryInput in DTO/CodeCodeSummaryRecord.cs.
export interface CashFlowQueryInput {
  recnum: string;
  startDate: string; // ISO date string; C# side is DateTime
  endDate: string;
}

// Matches CashFlowForecastResponse, which lives in Models/CostCodeList.cs despite the file name:
// BudgetForecast and ContractForecast, both lists of rows with JobNumber, JobName, TotalAmount,
// CurrentAmount, Remaining and ForecastMonths.
//
// The Cash Flow Forecast page shows the three amounts as Budget Amount / Costs As Of / Remaining in
// the Budget grid and Total Contract Amount / Billed As Of / Remaining in the Contract grid.
// ForecastMonths is keyed by a month label such as "Jan 2026", and each key becomes a grid column
// (taken from the first row's keys).
export interface CashFlowForecastRow {
  jobNumber: string;
  jobName: string;
  totalAmount: number;
  currentAmount: number;
  remaining: number;
  forecastMonths: Record<string, number>;
}

export interface CashFlowForecastResponse {
  budgetForecast: CashFlowForecastRow[];
  contractForecast: CashFlowForecastRow[];
}
