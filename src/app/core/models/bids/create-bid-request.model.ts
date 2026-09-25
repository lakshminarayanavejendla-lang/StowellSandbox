// Mirrors StowellCoApp.DTO.CreateBidRequest (DTO/BidInfoDto.cs), posted by NewBid.razor.
// CreatedBy was set server-side in the Blazor version (BidService.CreateNewBid ->
// GetUserEmail() from the ClaimsPrincipal) - see BidService's header comment for the
// MSAL-identity open question that carries over from Phase 1's JobService.
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
