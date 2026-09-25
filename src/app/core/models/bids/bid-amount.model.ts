// Mirrors StowellCoApp.DTO.BidAmounts and its request/response types (DTO/BidInfoDto.cs) -
// the "Bids" sub-grid (bid date + amount history) shown on the Overview tab.
export interface BidAmount {
  bidAmountID: number;
  internalBidID: number;
  bidDate?: string;
  bidAmount: number;
  status?: string;
  createdDate?: string;
}

export interface AddBidAmountRequest {
  internalBidID: number;
  bidDate: string;
  bidAmount: number;
  status?: string;
  modifiedBy?: string;
}

export interface UpdateBidAmountRequest {
  bidAmountID: number;
  bidDate?: string;
  bidAmount?: number;
  status?: string;
  modifiedBy?: string;
}

export interface DeleteBidAmountRequest {
  bidAmountID: number;
  modifiedBy?: string;
}

// Response shape assumed camelCase per Phase 1's convention (ASP.NET Core's default
// System.Text.Json casing) even though BidService.cs manually re-deserializes this one with
// PropertyNameCaseInsensitive = true - worth confirming the wire format matches.
export interface AddBidAmountResponse {
   Message?: string;
  message?: string;

  NewBidAmountID?: number;
  newBidAmountID?: number;
  newBidAmountId?: number;
}
