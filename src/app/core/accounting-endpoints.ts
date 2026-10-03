// API routes for Accounting (PO queue, budget approval, Add Form).
//
// Most of these aren't in GlobalEndpoints.cs. AccountingService.cs and CostCodeService.cs use them
// as plain strings, so they're copied exactly from there to hit the same routes the Blazor app did.
// Routes that are in GlobalEndpoints.cs say so below.
export const AccountingEndpoints = {
  // --- api/Accounting/* (StowellCoApp.Services.AccountingService) ---
  // GET api/Accounting/GetRecords/{email}: the queue grid.
  GetRecordsUrl: 'api/Accounting/GetRecords',
  // GET api/Accounting/GetCostCodes/{filter}: cost code search on the budget approval grids.
  GetCostCodesUrl: 'api/Accounting/GetCostCodes',
  // POST: loads the Approve New Budget page.
  GetApproveBudgetDataUrl: 'api/Accounting/GetApproveBudgetData',
  // POST: loads the Approve Modified Budget page.
  GetModifyBudgetDataUrl: 'api/Accounting/GetModifyBudgetData',
  // POST: the Approve button on both budget pages.
  BudgetApproveRequestUrl: 'api/Accounting/BudgetApproveRequest',
  // POST: the Reject button on both budget pages.
  BudgetRejectRequestUrl: 'api/Accounting/BudgetRejectRequest',
  // POST: Add Form's Create/Update Job button. Sends the BidInfoDto (with location, contractor and
  // project info) to Sage.
  SubmitToSageUrl: 'api/Accounting/SubmitToSage',

  // --- api/CostCode/* routes Accounting uses ---
  // In GlobalEndpoints.cs as GetAllUserJobsUrl.
  GetAllUserJobsUrl: 'api/CostCode/GetAllUserJobs',
  // GET api/CostCode/GetJobPhasesData/{jobId}. Only a string in CostCodeService.cs; there's no
  // GlobalEndpoints constant for it.
  GetJobPhasesDataUrl: 'api/CostCode/GetJobPhasesData',
  // GET api/CostCode/GetAllPhases: the Additional Phases dropdown on Add Form. The response is
  // { data: [...] }, not a plain array (see PhaseListResponse in cost-code.model.ts).
  GetAllPhasesUrl: 'api/CostCode/GetAllPhases',
} as const;

// --- Estimation routes that Add Form also calls ---
// Add Form is an Accounting page (opened from the queue for status 99), but most of its data comes
// from IEstimationService: the bid amounts, phases and employees grids, and the bid it prefills from.
// Only GetBidDetails and GetEmployees are in GlobalEndpoints.cs. The rest are guessed from the C#
// method names as api/Estimation/{MethodName}. Confirm them against EstimationService.cs, and
// consider using the Estimation module's own service instead of this copy.
export const EstimationBidEndpoints = {
  GetBidDetailsUrl: 'api/Estimation/GetBidDetails', // confirmed via GlobalEndpoints.cs
  GetEmployeesUrl: 'api/Estimation/GetEmployees', // confirmed via GlobalEndpoints.cs (bid-role employee list)
  GetAllContractorClientsUrl: 'api/Estimation/GetAllContractorClients', // inferred
  GetContractorClientByIdUrl: 'api/Estimation/GetContractorClientById', // inferred
  GetBidEmployeesUrl: 'api/Estimation/GetBidEmployees', // inferred
  GetBidsAmountUrl: 'api/Estimation/GetBidsAmountAsync', // inferred
  GetPhasesUrl: 'api/Estimation/GetPhases', // inferred
  InsertBidUrl: 'api/Estimation/InsertBid', // inferred
  InsertPhaseUrl: 'api/Estimation/InsertPhase', // inferred
  InsertEmployeeUrl: 'api/Estimation/InsertEmployee', // inferred
  DeleteBidAmountUrl: 'api/Estimation/DeleteBidAmount', // inferred
  DeletePhaseUrl: 'api/Estimation/DeletePhase', // inferred
  DeleteEmployeeUrl: 'api/Estimation/DeleteEmployee', // inferred
  UpdateBidUrl: 'api/Estimation/UpdateBid', // inferred
  GetLoggedUserEmailUrl: 'api/Estimation/GetLoggedUserEmail', // inferred
  GetAllEmployeesUrl: 'api/Estimation/GetAllEmployees', // inferred (bid-role employee list, same shape as GetAllContractorClients)
} as const;
