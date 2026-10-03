// Matches CostCodeRecord in DTO/CodeCodeSummaryRecord.cs: the rows of the Project Queue "Active
// Projects" grid and the Cost Code dropdowns on Create/Modify Budget.
export interface CostCodeRecord {
  recNum: number;
  jobNumber: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // Calculated properties in C# (RecNumber, RecJobNumber), not sent by the API. The component works them out.
}

export function recNumber(row: CostCodeRecord): string {
  return String(row.recNum);
}

export function recJobNumber(row: CostCodeRecord): string {
  return `${row.recNum} - ${row.jobNumber}`;
}

// Guessed: the BidItem class wasn't in the files we had. These are only the fields ProjectQueue.razor
// shows: JobID, BidDate, Address and Submitter. Check the full shape before using anything else.
export interface BidItem {
  jobID: string;
  bidDate: string;
  address?: string;
  submitter?: string;
}

// Guessed: the StatusModel class wasn't found either. The Cash Flow Report's status dropdown uses
// Status as the text and Id as the value. Check before using other fields.
export interface StatusModel {
  id: number;
  status: string;
}
