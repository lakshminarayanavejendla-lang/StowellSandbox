// Mirrors StowellCoApp.DTO.SubmitToSageResponse (confirmed - despite living in
// Services/AccountingService.cs rather than a DTO file, it's a plain response DTO returned
// by EstimationService.SubmitBid/UpdateBid/InsertBid).
export interface SubmitToSageResponse {
  success: boolean;
  message?: string;
  isExist: boolean;
}

// Mirrors StowellCoApp.DTO.EmployeeDetails (confirmed, DTO/BidInfoDto.cs). Returned by
// IEstimationService.GetEmployees(jobId) (api/Estimation/GetEmployees/{jobId}) - ported for
// interface completeness, but NOT actually called by AddBidBase/EditBidFormBase today (they
// use GetAllEmployees/GetBidEmployees instead). Flagging as possibly dead code, or used by a
// page outside this phase's scope.
export interface EmployeeDetails {
  id: string;
  role: string;
  employee: string;
}

// Hardcoded division picklist from AddBidBase.cs/EditBidFormBase.cs's `divisions` list -
// GUID-like values paired with display text. Not a service response; kept here as a typed
// constant shape for the component to import.
export interface DivisionOption {
  value: string;
  text: string;
}
