// Mirrors StowellCoApp.DTO.AccountingItem (defined inline in DTO/CodeCodeSummaryRecord.cs,
// alongside a large number of other DTOs that file's name doesn't suggest it holds - see
// HANDOFF-style flag in accounting.service.ts). One row of the Index.razor / IndexBase.cs
// "Active Projects" queue grid.
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

// StatusID -> route mapping lifted from Index.razor's inline switch:
//   "99"        -> AddForm (new project onboarding / not yet budgeted)
//   "1"         -> ApproveNewBudget
//   "2" or "3"  -> ApproveModifyBudget
//   default     -> AddForm
export type AccountingQueueAction = 'add-form' | 'approve-new-budget' | 'approve-modify-budget';

export function resolveAccountingQueueAction(statusId: string | null | undefined): AccountingQueueAction {
  switch (statusId) {
    case '99':
      return 'add-form';
    case '1':
      return 'approve-new-budget';
    case '2':
    case '3':
      return 'approve-modify-budget';
    default:
      return 'add-form';
  }
}
