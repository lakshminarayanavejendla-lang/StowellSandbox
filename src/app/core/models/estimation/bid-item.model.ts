// Matches BidItem in DTO/BidInfoDto.cs: one row in the Bid Queue's Open, Closed and Pending grids
// (from GetOpenBids, GetClosedBids and GetPendingBids).
export interface BidItem {
  ID: number;
  JobID: string;
  BidDate: string;
  Address: string;
  Submitter: string;
  BidStatus: string;
}
