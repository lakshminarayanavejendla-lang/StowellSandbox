// Mirrors StowellCoApp.DTO.CostCodeRecord (confirmed, DTO/CodeCodeSummaryRecord.cs) - the row
// shape behind both the Project Queue "Active Projects" grid and the Cost Code dropdowns used
// on Create/Modify Budget.
export interface CostCodeRecord {
  recNum: number;
  jobNumber: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // C# exposes these as computed get-only properties (RecNumber, RecJobNumber) rather than
  // wire fields - recomputed client-side in the component instead of expected from the API.
}

export function recNumber(row: CostCodeRecord): string {
  return String(row.recNum);
}

export function recJobNumber(row: CostCodeRecord): string {
  return `${row.recNum} - ${row.jobNumber}`;
}

// INFERRED - StowellCoApp.DTO.BidItem's class definition was never found in the DTO/Models
// files handed to this phase (it's referenced only via ICostCodeService.GetBids() and the
// Radzen grid template in ProjectQueue.razor). Fields below are only what that template binds:
// JobID, BidDate, Address, Submitter. Confirm the full shape with the Bids/Estimation phase
// before relying on any field not listed here.
export interface BidItem {
  jobID: string;
  bidDate: string;
  address?: string;
  submitter?: string;
}

// INFERRED - StowellCoApp.DTO.StatusModel was never found either (only used via
// ICostCodeService.GetAllStatusesData(), bound in CashFlowReport.razor's status dropdown with
// TextProperty="Status" ValueProperty="Id"). Confirm before relying on other fields.
export interface StatusModel {
  id: number;
  status: string;
}
