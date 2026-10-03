// Matches the BidAmount, BidPhase and BidEmployee models. These are the three row lists on Add Bid
// and Edit Bid (add with a popup, show in a grid, delete): Bids (amount history), Additional Phases
// and Project Resources (employees).

// The C# property really is "BidAmount1". EF Core does this when a column has the same name as its
// class. Kept as is so the API contract stays clear; rename it if the API team says it's safe.
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
