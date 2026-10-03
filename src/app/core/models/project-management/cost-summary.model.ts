// Matches the DTOs in DTO/CodeCodeSummaryRecord.cs: Job, CostCode, Phase, CostCodeSummaryRecord,
// CostCodeSummaryModel, BudgetPayment, CashFlowRecord and CurrentCostSummaryViewModel.

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
  // Open PO amounts on this cost code. Already taken out of `remaining`.
  committed?: number;
  // Set in the app, not by the API: the phase filter used for these rows ("All phases" if none). The
  // procedure returns one row per cost code, not per phase.
  phase?: string;
}

export interface CostCodeSummaryModel {
  costCodeSummary: CostCodeSummaryRecord[];
  sumOfBudgetAndChanges: number;
  sumOfToDate: number;
  sumOfThisPeriod: number;
  sumOfRemaining: number;
  sumOfCommitted?: number;
  // A calculated property in C#: (Budget + Changes - Remaining) / (Budget + Changes) * 100. The JSON
  // includes it, so it's read as a field, not recalculated.
  percentage: number;
}

export interface BudgetPayment {
  recnum: string;
  budget: string;
  paid: string;
  balance: string;
}

// Casing: ASP.NET Core only lowercases the first letter of each name, so A_REndBal_Today arrives as
// a_REndBal_Today. The names below follow that. Check a live response if in doubt.
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
