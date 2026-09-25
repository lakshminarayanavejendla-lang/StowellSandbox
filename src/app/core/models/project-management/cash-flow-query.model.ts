// Mirrors StowellCoApp.DTO.CashFlowQueryInput (confirmed, DTO/CodeCodeSummaryRecord.cs).
export interface CashFlowQueryInput {
  recnum: string;
  startDate: string; // ISO date string; C# side is DateTime
  endDate: string;
}

// RECONCILED during the Reporting Dashboard phase (Phase 3): the Project Management phase left
// this as `unknown` because StowellCoApp.Models.CashFlowForecastResponse wasn't among its staged
// files. It has since been found - it actually lives in Models/CostCodeList.cs (a grab-bag model
// file whose name doesn't match most of its contents, same pattern as DTO/CodeCodeSummaryRecord.cs
// flagged in HANDOFF.md). Confirmed shape, replacing the old `unknown` placeholder:
//
//   public class CashFlowForecastResponse
//   {
//       public List<CashFlowForecastRow> BudgetForecast { get; set; } = new();
//       public List<CashFlowForecastRow> ContractForecast { get; set; } = new();
//   }
//   public class CashFlowForecastRow
//   {
//       public string JobNumber { get; set; }
//       public string JobName { get; set; }
//       public decimal TotalAmount { get; set; }
//       public decimal CurrentAmount { get; set; }
//       public decimal Remaining { get; set; }
//       public Dictionary<string, decimal> ForecastMonths { get; set; } = new();
//   }
//
// Confirmed against the real caller too (Components/Pages/ReportingDashboard/
// CashFlowForecastBase.razor.cs): TotalAmount/CurrentAmount/Remaining are rendered as "Budget
// Amount"/"Costs As Of"/"Remaining" in the Budget grid and "Total Contract Amount"/"Billed As
// Of"/"Remaining" in the Contract grid (same three fields, reused for both), and ForecastMonths
// is a dictionary keyed by a month label (e.g. "Jan 2026") used to build one dynamic grid column
// per key - both grids read their column set from `.FirstOrDefault()?.ForecastMonths.Keys`.
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
