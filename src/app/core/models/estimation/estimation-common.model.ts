// Matches SubmitToSageResponse, which SubmitBid, UpdateBid and InsertBid return. It's defined in
// Services/AccountingService.cs, not a DTO file.
export interface SubmitToSageResponse {
  success: boolean;
  message?: string;
  isExist: boolean;
}

// Matches EmployeeDetails in DTO/BidInfoDto.cs, returned by GetEmployees(jobId)
// (api/Estimation/GetEmployees/{jobId}). Add Bid and Edit Bid don't call it; they use
// GetAllEmployees and GetBidEmployees. It may be unused.
export interface EmployeeDetails {
  id: string;
  role: string;
  employee: string;
}

// The fixed division list from AddBidBase.cs and EditBidFormBase.cs: GUID-like values with display
// text. Not from the API.
export interface DivisionOption {
  value: string;
  text: string;
}
