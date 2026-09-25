// Mirrors StowellCoApp.DTO.Bids (DTO/BidInfoDto.cs) - the flat row shape used by
// CurrentBids.razor's grid and by both grids in BidQueue.razor (via BidQueueDTO below).
// Renamed from the C# class's plural "Bids" to the singular "Bid" to avoid an awkward
// TypeScript identifier; the API route names (GetCurrentBidsUrl etc.) are unaffected.
export interface Bid {
  bidId: string;
  bidName: string;
  bidManager: string;
  bidder: string;
  status: string;
}

// Mirrors StowellCoApp.DTO.BidQueueDTO, returned by GetBidQueueData (BidQueue.razor).
export interface BidQueueData {
  currentBids: Bid[];
  closedBids: Bid[];
}
