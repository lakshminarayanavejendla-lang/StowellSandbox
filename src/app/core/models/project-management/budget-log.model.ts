// NEW model - client-updated Moqups (page TAB-Budget/Financials, the "Budget Log" table under
// the Total Budget/Paid/Remaining summary). No backend endpoint exists for this yet - see
// budget-log.service.ts's header comment.
export interface BudgetLogEntry {
  date: string;
  logNote: string;
}
