// Matches BidAmounts and its request and response types (DTO/BidInfoDto.cs): the Bids grid of bid
// dates and amounts on the Overview tab.
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

// Assumed camelCase, ASP.NET Core's default. BidService.cs reads this one case-insensitively, so
// check the real format.
export interface AddBidAmountResponse {
   Message?: string;
  message?: string;

  NewBidAmountID?: number;
  newBidAmountID?: number;
  newBidAmountId?: number;
}
