// Matches AccountingItem (in DTO/CodeCodeSummaryRecord.cs, which holds many unrelated DTOs). One row
// of the Accounting "Active Projects" grid.
export interface AccountingItem {
  id: number;
  jobID: string;
  jobName: string;
  jobType: string;
  bidDate: string; // DateTime on the wire; kept as ISO string, format at display time
  address: string;
  submitter: string;
  bidStatus: string;
  statusID: string;
}

// Which page each StatusID opens, from Index.razor:
//   "99"        -> AddForm (new project onboarding / not yet budgeted)
//   "1"         -> ApproveNewBudget
//   "2" or "3"  -> ApproveModifyBudget
//   default     -> AddForm
export type AccountingQueueAction = 'add-form' | 'approve-new-budget' | 'approve-modify-budget';

// --- Accounting Queue approval types (Mike Smith, 2026-09-26) ---
// Anything financial needs Accounting approval, so the queue is grouped by approval type. Bids and
// projects no longer need approval and aren't in the queue. PO, CO, Invoice and Budget Allocation are
// listed even without an approval step yet, and stay empty until their submit flows add items.
export type ApprovalType =
  | 'Initial Budget Creation'
  | 'Purchase Order'
  | 'Change Order'
  | 'Invoice'
  | 'Budget Allocation - Prime'
  | 'Budget Allocation - Internal'
  | 'Project File Creation'
  | 'Budget Update';

/** Types shown as filters, in the order Mike listed them. `ready` = an approval step exists that can put items in the queue. */
export const APPROVAL_TYPES: { type: ApprovalType; ready: boolean }[] = [
  { type: 'Initial Budget Creation', ready: true },
  { type: 'Purchase Order', ready: true },
  { type: 'Change Order', ready: true },
  { type: 'Invoice', ready: false }, // placeholder - not in scope yet
  { type: 'Budget Allocation - Prime', ready: true },
  { type: 'Budget Allocation - Internal', ready: true },
];

/** The existing "Active Projects" rows keep their status meaning; map them onto the new types. The two legacy types stay
 * visible until bid/project file creation is decided (pending Sheena's answer) so nothing waiting on Accounting is hidden. */
export function approvalTypeFor(statusId: string | null | undefined): ApprovalType {
  switch (statusId) {
    case '1':
    case '2':
      return 'Initial Budget Creation';
    case '3':
      return 'Budget Update';
    default:
      return 'Project File Creation';
  }
}

export function resolveAccountingQueueAction(statusId: string | null | undefined): AccountingQueueAction {
  switch (statusId) {
    case '99':
      return 'add-form';
    // 1 = new budget, 2 = initial budget for an added phase (both wait for approval and open the same approval screen); 3 = rejected,
    // which no longer appears in the queue (Mike Smith, 2026-09-26). Budget changes after that go through Change Orders.
    case '1':
    case '2':
      return 'approve-new-budget';
    case '3':
      return 'approve-modify-budget';
    default:
      return 'add-form';
  }
}
