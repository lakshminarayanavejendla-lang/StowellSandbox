// Matches BidAccessSummary and its request types (DTO/BidInfoDto.cs): the Bid Access grid of roles
// and employees on the Details tab.
export interface BidAccessSummary {
  bidAccessID: number;
  employeeName?: string;
  roleName?: string;
  createdDate?: string;
}

export interface AddBidAccessRequest {
  internalBidID: number;
  roleName?: string;
  employeeName?: string;
  modifiedBy?: string;
}

export interface RemoveBidAccessRequest {
  bidAccessID: number;
  modifiedBy?: string;
}

export interface AddBidAccessResponse {
  message?: string;
  Message?: string;
  newBidAccessID?: number;
  NewBidAccessID?: number;
}