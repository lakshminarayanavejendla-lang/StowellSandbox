// Change Order Budget Allocation (Moqups page FORM-CO Reallocation, link shared 2026-09-13). One
// grid where each cost code line has its own Debit and Credit, replacing the earlier separate source
// and destination lists. CO Type (Prime or Internal) decides which fields are required (see
// mandatoryFieldsMissing() in co-budget-allocation.component.ts).
export interface CoBudgetLine {
  costCode: string;
  costCodeDescription: string;
  debit: number;
  credit: number;
}

export type CoBudgetAllocationType = 'Prime' | 'Internal' | '';

export interface CoBudgetAllocationSubmission {
  coId?: number;
  coNumber: string;
  jobId: string;
  jobName: string;
  coType: CoBudgetAllocationType;
  coDescription: string;
  coReason: string;
  coStatus: string;
  overallBudget: number;
  profitOnSell: number;
  requestedAmount: number | null;
  approvedAmount: number | null;
  createdBy: string;
  phases: string[];
  lines: CoBudgetLine[];
}

export interface CoBudgetAllocationSaveResult {
  saved: boolean;
  allocationId?: number;
  error?: string;
}

export interface CoBudgetAllocationSubmitResult {
  submitted: boolean;
  /** A submitted allocation now waits for Accounting approval: this is the approval request id (coNumber/allocationId are assigned on approval). */
  requestId?: number;
  status?: string;
  coNumber?: string;
  allocationId?: number;
  error?: string;
}

// What CoBudgetAllocationController.GetById returns (CO_GetBudgetReallocationById), used to open an
// allocation at co-budget-allocation/:allocationId or co-budget-reallocation/:allocationId.
// `status` is the record's own state (Draft or Submitted); `coStatus` is the value picked in the dropdown.
export interface CoBudgetAllocationDetail {
  allocationId: number;
  coNumber: string;
  jobId: string;
  jobName: string;
  coType: CoBudgetAllocationType;
  coDescription: string;
  coReason: string;
  coStatus: string;
  overallBudget: number;
  budgetChangeTotal: number;
  profitOnSell: number;
  requestedAmount: number | null;
  approvedAmount: number | null;
  status: string;
  createdBy: string;
  createdDate: string;
  phases: string[];
  lines: CoBudgetLine[];
}

/** A submitted allocation waiting for Accounting approval (Accounting Queue, type "Budget Allocation - Prime/Internal"). */
export interface PendingAllocationApproval {
  requestId: number;
  coType: string;
  jobId: string;
  jobName: string;
  coDescription: string;
  coReason: string;
  createdBy: string;
  budgetChangeTotal: number;
  submittedDate: string;
}

export interface AllocationApprovalResult {
  succeeded: boolean;
  coNumber?: string;
  allocationId?: number;
  error?: string;
}