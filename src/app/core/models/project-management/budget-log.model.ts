// The Budget Log table under the budget summary (Moqups page TAB-Budget/Financials). There's no
// API for it yet (see budget-log.service.ts).
export interface BudgetLogEntry {
  date: string;
  logNote: string;
}
