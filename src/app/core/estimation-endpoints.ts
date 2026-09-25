// Endpoint constants for the Estimation module (AddBid/EditBidForm/BidQueue).
//
// This is a NEW, module-scoped file - it deliberately does NOT edit or extend the shared
// core/global-endpoints.ts (owned by Phase 1 / used across modules) to avoid colliding with
// the parallel Bids/Project Management/Accounting agents. Two of these values
// (GetBidDetailsUrl, GetEmployeesUrl) do already have equivalents in the real C#
// Common/GlobalEndpoints.cs (GetBidDetails, GetEmployees) - repeated here as string literals
// so this module doesn't have to import a file it was told not to touch. Keep both in sync if
// either changes.
//
// Everything else below is NOT in Common/GlobalEndpoints.cs at all - EstimationService.cs
// builds these routes as inline string literals (e.g. "api/Estimation/GetOpenBids") rather
// than going through the shared constants class. They're reproduced here verbatim from that
// file so the Angular app keeps calling the exact same StowellCoAPI routes; flagging this
// inconsistency (some Estimation routes centralized, most not) as something worth cleaning up
// on the API side rather than silently "fixing" by inventing different constant names.
export const EstimationEndpoints = {
  GetOpenBidsUrl: 'api/Estimation/GetOpenBids',
  GetClosedBidsUrl: 'api/Estimation/GetClosedBids',
  GetPendingBidsUrl: 'api/Estimation/GetPendingBids',
  GetBidDetailsUrl: 'api/Estimation/GetBidDetails', // matches GlobalEndpoints.GetBidDetails in Common/GlobalEndpoints.cs
  GetEmployeesUrl: 'api/Estimation/GetEmployees', // matches GlobalEndpoints.GetEmployees in Common/GlobalEndpoints.cs; see EmployeeDetails model note - unused by AddBid/EditBidForm today
  GetAllEmployeesUrl: 'api/Estimation/GetAllEmployees',
  GetAllContractorClientsUrl: 'api/Estimation/GetAllContractorClients',
  GetContractorClientByIdUrl: 'api/Estimation/GetContractorClientById',
  GetBidEmployeesUrl: 'api/Estimation/GetBidEmployees',
  InsertBidUrl: 'api/Estimation/InsertBid',
  GetUserNameUrl: 'api/Estimation/GetUserName',
  GetNewBidNumberUrl: 'api/Estimation/GetNewBidNumber',
  GetBidsAmountUrl: 'api/Estimation/GetBidsAmountAsync',
  GetPhasesUrl: 'api/Estimation/GetPhases',
  InsertPhaseUrl: 'api/Estimation/InsertPhase',
  InsertEmployeeUrl: 'api/Estimation/InsertEmployee',
  SubmitBidUrl: 'api/Estimation/SubmitBid',
  UpdateBidUrl: 'api/Estimation/UpdateBid',
  DeleteBidAmountUrl: 'api/Estimation/DeleteBidAmount',
  DeletePhaseUrl: 'api/Estimation/DeletePhase',
  DeleteEmployeeUrl: 'api/Estimation/DeleteEmployee',
  // Cross-module: this route actually lives on ICostCodeService/CostCodeService.cs (not
  // IEstimationService), under api/CostCode/*. AddBid/EditBidForm depend on it for the
  // "Additional Phases" popup's Phase dropdown, so it's included here rather than left out -
  // if/when a shared CostCodeService is ported for another module, consolidate this there
  // instead of duplicating it a third time.
  GetAllPhasesUrl: 'api/CostCode/GetAllPhases',
} as const;
