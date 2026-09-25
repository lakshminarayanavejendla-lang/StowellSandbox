// UPDATED - Stowell PO/CO Module mockup update, page FORM-CO Reallocation (Change Order Budget
// Allocation). Replaces the earlier source/destination debit-credit split (see git history) with
// a single unified grid where every cost code line carries its own Debit and Credit, matching the
// current Moqups page (link shared 2026-09-13). CO Type (Prime/Internal) drives which fields are
// mandatory - see co-budget-allocation.component.ts's mandatoryFieldsMissing().
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
  coNumber?: string;
  allocationId?: number;
  error?: string;
}

// NEW - backs CoBudgetAllocationController.GetById (CO_GetBudgetReallocationById), used to load
// an existing allocation for the 'co-budget-allocation/:allocationId' /
// 'co-budget-reallocation/:allocationId' routes. `status` is the allocation record's own
// lifecycle state (Draft/Submitted) - distinct from `coStatus`, the user-picked dropdown value.
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
