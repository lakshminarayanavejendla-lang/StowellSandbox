// Endpoint constants for the Accounting module (PO queue, budget approval, AddForm).
//
// IMPORTANT: unlike core/global-endpoints.ts, most of these routes are NOT defined as
// constants in the Blazor source's Common/GlobalEndpoints.cs. AccountingService.cs and
// CostCodeService.cs call several of them as raw string literals inline (e.g.
// "api/Accounting/GetRecords/{email}"), sometimes right next to a commented-out
// GlobalEndpoints-style constant that was never actually wired up. Where a real
// GlobalEndpoints.cs constant exists it's noted below; everything else is transcribed
// verbatim from the literal strings in AccountingService.cs / CostCodeService.cs so this
// Angular app keeps hitting the exact same StowellCoAPI routes the Blazor app used.
export const AccountingEndpoints = {
  // --- api/Accounting/* (StowellCoApp.Services.AccountingService) ---
  // GET api/Accounting/GetRecords/{email} - Index.razor / IndexBase.cs queue grid.
  GetRecordsUrl: 'api/Accounting/GetRecords',
  // GET api/Accounting/GetCostCodes/{filter} - cost-code-description autocomplete on the
  // budget approval grids (RadzenAutoComplete LoadData).
  GetCostCodesUrl: 'api/Accounting/GetCostCodes',
  // POST api/Accounting/GetApproveBudgetData - ApproveNewBudgetBase's initial/on-change load.
  GetApproveBudgetDataUrl: 'api/Accounting/GetApproveBudgetData',
  // POST api/Accounting/GetModifyBudgetData - ApproveModifyBudgetBase's initial/on-change load.
  GetModifyBudgetDataUrl: 'api/Accounting/GetModifyBudgetData',
  // POST api/Accounting/BudgetApproveRequest - "Approve" button on both budget pages.
  BudgetApproveRequestUrl: 'api/Accounting/BudgetApproveRequest',
  // POST api/Accounting/BudgetRejectRequest - "Reject" button on both budget pages.
  BudgetRejectRequestUrl: 'api/Accounting/BudgetRejectRequest',
  // POST api/Accounting/SubmitToSage - AddForm's "Create/Update Job" button, pushes the
  // assembled BidInfoDto (+ nested location/contractor/project-info) into Sage.
  SubmitToSageUrl: 'api/Accounting/SubmitToSage',

  // --- api/CostCode/* (StowellCoApp.Services.CostCodeService) actually used by Accounting ---
  // Confirmed in Common/GlobalEndpoints.cs as GetAllUserJobsUrl.
  GetAllUserJobsUrl: 'api/CostCode/GetAllUserJobs',
  // GET api/CostCode/GetJobPhasesData/{jobId} - literal in CostCodeService.cs, no
  // GlobalEndpoints constant exists for it (one was referenced in a comment,
  // "GlobalEndpoints.GetJobPhasesData", but that member doesn't exist in the file).
  GetJobPhasesDataUrl: 'api/CostCode/GetJobPhasesData',
  // GET api/CostCode/GetAllPhases - used by AddForm's "Additional Phases" popup dropdown.
  // Note the real controller wraps the payload as ApiListResponse<Phase> ({ data: [...] }),
  // not a bare array - see PhaseListResponse in cost-code.model.ts.
  GetAllPhasesUrl: 'api/CostCode/GetAllPhases',
} as const;

// --- Estimation-module endpoints AddForm.razor/AddFormBase.cs also call ---
// AddForm is nominally an Accounting page (routed from the accounting queue for JobID with
// StatusID "99"), but its code-behind leans almost entirely on IEstimationService for the
// Bid Amounts / Bid Phases / Bid Employees sub-grids and for prefilling the form from the
// original bid record. That service is Estimation's, being converted in parallel by another
// agent - only two of these routes are confirmed via Common/GlobalEndpoints.cs
// (GetBidDetails, GetEmployees); the rest are INFERRED from IEstimationService's C# method
// names following the same "api/Estimation/{MethodName}" convention, since
// EstimationService.cs's actual implementation wasn't read as part of this phase (out of
// scope - Estimation module territory). CONFIRM these against the real EstimationService.cs
// (or whatever the Estimation agent ships) before relying on them; consider having AddForm
// consume the Estimation module's own Angular service directly once it exists, instead of
// this parallel copy.
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
