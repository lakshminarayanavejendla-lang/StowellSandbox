// API routes for the Estimation module (Add Bid, Edit Bid, Bid Queue).
//
// Kept separate from global-endpoints.ts. GetBidDetailsUrl and GetEmployeesUrl are also in the C#
// GlobalEndpoints.cs, so keep both in sync. The rest are plain strings in EstimationService.cs
// (for example "api/Estimation/GetOpenBids"), copied exactly. Moving them into one place is
// worth doing on the API side.
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
  // This one is really a CostCode route (api/CostCode/*). The Additional Phases popup needs it for the
  // Phase dropdown. If a shared CostCodeService gets ported, use that instead of a third copy.
  GetAllPhasesUrl: 'api/CostCode/GetAllPhases',
} as const;
