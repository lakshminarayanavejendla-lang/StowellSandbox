// Mirrors StowellCoApp.Models.BidAmount / BidPhase / BidEmployee (confirmed, Models/*.cs).
// These are the three repeating "add a row via popup, list in a grid, delete a row" line-item
// sections on AddBid/EditBidForm: Bids (bid amount history), Additional Phases, and Project
// Resources (employee assignments).

// BidAmount.BidAmount1 - the C# property is literally named "BidAmount1" (EF Core's usual
// dedup pattern when a column collides with its table/class name, e.g. a "BidAmount" column
// on a "BidAmount" table). Kept the odd name rather than silently renaming it to `amount` so a
// backend contract diff stays obvious; do rename if the API team confirms it's safe.
export interface BidAmount {
  id: number;
  jobId: string;
  bidDate?: string | null; // DateOnly on the wire
  bidAmount1?: number | null;
  isDeleted?: boolean | null;
  deletedDate?: string | null;
}

export interface BidPhase {
  id: number;
  jobId: string;
  phase?: string | null;
  description?: string | null;
  isDeleted?: boolean | null;
  deletedDate?: string | null;
}

export interface BidEmployee {
  id: number;
  jobId: string;
  role?: string | null;
  employee?: string | null;
  employeeId?: number | null;
  isDeleted?: boolean | null;
  deletedDate?: string | null;
}
