// Matches Bids in DTO/BidInfoDto.cs: one row in the Current Bids grid and both Bid Queue grids
// (through BidQueueDTO below). Named Bid, not Bids, because a plural type name reads oddly in
// TypeScript. The API routes don't change.
export interface Bid {
  bidId: string;
  bidName: string;
  bidManager: string;
  bidder: string;
  status: string;
}

// Matches BidQueueDTO, returned by GetBidQueueData.
export interface BidQueueData {
  currentBids: Bid[];
  closedBids: Bid[];
}
