// Mirrors the StowellCoApp.DTO classes confirmed in DTO/CodeCodeSummaryRecord.cs (Job,
// CostCode, Phase, CostCodeSummaryRecord, CostCodeSummaryModel, BudgetPayment, CashFlowRecord,
// CurrentCostSummaryViewModel).

export interface Job {
  fullJob: string;
  jobName: string;
  recnum: string;
}

export interface CostCode {
  id: string;
  description: string;
}

export interface Phase {
  recnum: string;
  phaseNum: string;
  phaseName: string;
  source?: string;
  email?: string;
}

export interface CostCodeSummaryRecord {
  id: number;
  jobNumber: string;
  costCode: string;
  costCodeDescription: string;
  budgetAndChanges: number;
  toDate: number;
  thisPeriod: number;
  remaining: number;
  // Open PO commitments against this cost code - already subtracted from `remaining`.
  committed?: number;
  // Client-side only: the phase filter these rows were run under ("All phases" when none). The
  // summary procedure returns one row per cost code, not per phase, so it can't be a per-row value.
  phase?: string;
}

export interface CostCodeSummaryModel {
  costCodeSummary: CostCodeSummaryRecord[];
  sumOfBudgetAndChanges: number;
  sumOfToDate: number;
  sumOfThisPeriod: number;
  sumOfRemaining: number;
  sumOfCommitted?: number;
  // C# computed get-only property: (Budget+Changes - Remaining) / Budget+Changes * 100.
  // Present on the wire since System.Text.Json serializes computed getters too - kept here
  // as a plain field rather than recomputed, to match what the API actually returns.
  percentage: number;
}

export interface BudgetPayment {
  recnum: string;
  budget: string;
  paid: string;
  balance: string;
}

// NOTE ON CASING: ASP.NET Core's default JSON output policy only lowercases the FIRST
// character of each property name - it does not touch embedded underscores/capitals further
// in the name. So `A_REndBal_Today` serializes to `a_REndBal_Today`, not `aREndBalToday`.
// Property names below intentionally mirror that exact wire format; verify against a live
// response before assuming otherwise.
export interface CashFlowRecord {
  recNum: number;
  jobNumber: string;
  cashCollected: number;
  cashPaid: number;
  netCash: number;
  invoiceJ2D: number;
  a_REndBal_Today: number;
  jobcoststodate: number;
  a_PEndBal_Today: number;
  cashPaidOut: number;
  netCashInOut: number;
}

export interface CurrentCostSummaryViewModel {
  selectedJobId: string;
  selectedJobName: string;
  shareFolderLink?: string;
  selectedCostCodeIds?: string[];
  selectedPhaseId?: string;
  startDate?: string;
  endDate?: string;
  jobs?: Job[];
  costCodes?: CostCode[];
  phases?: Phase[];
  costCodeSummaryModel?: CostCodeSummaryModel;
  cashFlowRecord?: CashFlowRecord;
  budgetPayment?: BudgetPayment;
}

export interface ContractSummary {
  originalContractAmount: number;
  changesToDate: number;
  newContract: number;
  invoicedToDate: number;
  balanceOnContract: number;
  jobName: string;
}

export interface PrimeChangeList {
  jobNum: string;
  jobName: string;
  recNum: string;
  chgNum: string;
  chgDate: string;
  description: string;
  status: string;
  reqAmt: number;
  appAmt: number;
}

export interface InvoiceReceivable {
  recNum: number;
  invNum: string;
  invDate: string;
  description: string;
  dueDate: string;
  status: number;
  invTtl: number;
  amtPad: number;
  discCred: number;
  invBal: number;
  retain: number;
  invNet: number;
}

export interface InvoicePayment {
  recNum: number;
  jobName: string;
  invNum: string;
  invDate: string;
  dueDate: string;
  invoiceTotal: number;
  balance: number;
}
