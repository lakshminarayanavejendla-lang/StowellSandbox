// Mirrors StowellCoApp.DTO.BidItem (confirmed, DTO/BidInfoDto.cs) - the row shape for
// BidQueue's three grids (Open/Closed/Pending), populated from
// GetOpenBids/GetClosedBids/GetPendingBids.
export interface BidItem {
  ID: number;
  JobID: string;
  BidDate: string;
  Address: string;
  Submitter: string;
  BidStatus: string;
}
