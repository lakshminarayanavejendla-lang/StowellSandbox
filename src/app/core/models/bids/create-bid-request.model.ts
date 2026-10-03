// Matches CreateBidRequest in DTO/BidInfoDto.cs, sent by the New Bid page. Blazor set CreatedBy on
// the server from the signed-in user; see the note at the top of bid.service.ts.
export interface CreateBidRequest {
  bidId?: string;
  department?: string;
  division?: string;
  bidName?: string;
  address1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  createdBy?: string;
}
