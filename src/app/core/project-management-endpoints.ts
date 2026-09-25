// Endpoint constants for the Project Management module. Kept separate from the shared
// core/global-endpoints.ts (owned by Phase 1 / Dashboard) to avoid merge collisions with the
// other phase-2 agents converting Bids/Estimation/Accounting in parallel.
//
// Two tiers of confidence here:
//  1. Entries confirmed against StowellCoApp.Common.GlobalEndpoints (the C# constants class) -
//     these are exact, centrally-defined routes.
//  2. Entries NOT present in GlobalEndpoints.cs but found as inline string literals inside the
//     C# service implementations (CostCodeService.cs, ProjectBudget.cs, ReportingServices.cs).
//     These are real routes the Blazor app calls today, just not centralized on the backend -
//     recommend adding them to GlobalEndpoints.cs server-side for consistency. Flagged inline.
//  3. Two entries are INFERRED (not literally seen anywhere, C# only calls
//     `_estimateservice.GetAllContractorClients()` / `.GetPhases(id)` via IEstimationService,
//     whose implementation lives outside the files handed to this phase). Confirm with the
//     Estimation-phase agent/backend before relying on these two.
export const ProjectManagementEndpoints = {
  // --- Confirmed via StowellCoApp.Common.GlobalEndpoints ---
  GetCurrentCostSummaryViewModelUrl: 'api/ProjectOverview/GetCurrentCostSummaryViewModel',
  GetJobDetailsUrl: 'api/ProjectOverview/GetJobDetails',
  GetJobCostSummaryRecordsUrl: 'api/JobSummary/GetJobCostSummaryRecords',
  GetJobCostSummaryRecordsWithRecnumUrl: 'api/JobSummary/GetJobCostSummaryRecordsWithRecnum',
  GetAllStatusesDataUrl: 'api/CostCode/GetAllStatusesData',
  GetAllUserJobsByStatusUrl: 'api/CostCode/GetAllUserJobsByStatus',
  GetCashFlowAllDataByPeriodUrl: 'api/CashFlow/CashFlowAllDataByPeriod',
  GetAllUserJobsUrl: 'api/CostCode/GetAllUserJobs',
  // Typo ("Mulitple") preserved exactly as declared server-side in GlobalEndpoints.cs.
  CashFlowAllDataByMulitpleJobsAndPeriodUrl: 'api/CashFlow/CashFlowAllDataByMulitpleJobsAndPeriod',
  GetBidDetailsUrl: 'api/Estimation/GetBidDetails',
  GetEmployeesUrl: 'api/Estimation/GetEmployees',

  // --- Not centralized in GlobalEndpoints.cs; ported from inline literals in the service .cs files ---
  GetCostCodeRecordsUrl: 'api/CostCode/GetCostCodeRecords',
  GetBidsUrl: 'api/CostCode/GetBids',
  GetJobPhasesDataUrl: 'api/CostCode/GetJobPhasesData',
  GetAllPhasesUrl: 'api/CostCode/GetAllPhases',
  GetAllPeriodsDataUrl: 'api/CostCode/GetAllPeriodsData',
  GetContractSummaryDataUrl: 'api/CashFlow/GetContractSummaryData',
  GetPrimeChangeListUrl: 'api/CashFlow/GetPrimeChangeList',
  GetInvoiceReceivableUrl: 'api/CashFlow/GetInvoiceReceivable',
  GetARInvoiceUrl: 'api/CashFlow/GetARInvoice',
  GetCostCodesForReportUrl: 'api/CostCodeSummary/GetCostCodesForReport',
  GetJobCodesForReportUrl: 'api/CostCodeSummary/GetJobCodesForReport',
  GetPhasesForReportUrl: 'api/CostCodeSummary/GetPhasesForReport',
  // NB: distinct endpoint from GetCurrentCostSummaryViewModelUrl above - this is
  // CostCodeService's own "V1" overload (query-string driven: recnum/costCode/phase/startDate/
  // endDate) used by the Cost Code Summary report page, not the tab-overview one.
  GetCurrentCostSummaryViewModel1Url: 'api/CostCodeSummary/GetCurrentCostSummaryViewModel1',
  GetProjectBudgetRecordsUrl: 'api/ProjectBudgetConfiguration/GetProjectBudgetRecords',
  SaveCreateBatchCostCodesUrl: 'api/ProjectBudgetConfiguration/SaveCreateBatchCostCodes',
  SubmitBatchCostCodesUrl: 'api/ProjectBudgetConfiguration/SubmitBatchCostCodes',
  GetCostCodesAsyncUrl: 'api/ProjectBudgetConfiguration/GetCostCodesAsync',
  UploadAddExcelUrl: 'api/ProjectBudgetConfiguration/UploadAddExcel',
  GetCashFlowForecastReportDataUrl: 'api/Reports/GetCashFlowForecastReportData',

  // --- INFERRED, unconfirmed - see file header note ---
  GetAllContractorClientsUrl: 'api/Estimation/GetAllContractorClients',
  GetEstimationPhasesUrl: 'api/Estimation/GetPhases',

  // --- NEW - Stowell PO Module (from the "Stowell PO Module" Moqups design spec, not a Blazor
  // port). All 7 endpoints below are now real, implemented in PoQueueController.cs/
  // CoQueueController.cs. Reads (GetPoQueueData/GetJobPoOverview/GetCoQueueData) cross-DB-join
  // SAGESBQ into StowellSandbox.dbo.pchord/prmchg (real Sage PO/CO records). SavePoRequest/
  // SaveCoRequest write only to new SAGESBQ-owned draft tables (safe/reversible - no Sage record
  // created). SubmitPoRequest/SubmitCoRequest are the one operation that actually inserts a
  // real, permanent, numbered PO/CO into StowellSandbox.dbo.pchord+pcorln / prmchg+sbcgln - see
  // po_module_write_side.sql for the full design rationale and known gaps (vendor/cost-code are
  // still free text on the Angular form, not real Sage lookups). ---
  GetPoQueueDataUrl: 'api/PoQueue/GetPoQueueData',
  GetJobPoOverviewUrl: 'api/PoQueue/GetJobPoOverview',
  GetCoQueueDataUrl: 'api/CoQueue/GetCoQueueData',
  SavePoRequestUrl: 'api/PoQueue/SavePoRequest',
  SubmitPoRequestUrl: 'api/PoQueue/SubmitPoRequest',
  SaveCoRequestUrl: 'api/CoQueue/SaveCoRequest',
  SubmitCoRequestUrl: 'api/CoQueue/SubmitCoRequest',
  GetPoDraftsUrl: 'api/PoQueue/GetPoDrafts',
  GetPoDraftUrl: 'api/PoQueue/GetPoDraft',
  DeletePoDraftUrl: 'api/PoQueue/DeletePoDraft',
  GetCoDraftsUrl: 'api/CoQueue/GetCoDrafts',
  GetCoDraftUrl: 'api/CoQueue/GetCoDraft',
  DeleteCoDraftUrl: 'api/CoQueue/DeleteCoDraft',
  DeleteEmployeeUrl: 'api/Estimation/DeleteEmployee',

  // --- NEW, NOT YET CONFIRMED - edit-on-click for an already-submitted PO/CO (Master Job PO/CO
  // ID columns in po-queue/co-queue/po-tab are now links to an edit form). Unlike the 7 endpoints
  // above, PoQueueController.cs/CoQueueController.cs do NOT implement these two pairs yet - no
  // "get one existing Sage PO/CO record" or "update it" operation exists server-side. URLs below
  // follow the same path-param convention as GetPoDraftUrl/GetCoDraftUrl (`{base}/{id}`) purely
  // as a guess at what the real routes will look like - CONFIRM against the backend before
  // relying on them; until then getPoById/getCoById resolve to null and updatePo/updateCo resolve
  // to {saved:false} via the same catchError-to-null/false pattern used everywhere else in this
  // file's services, so the edit form loads empty and Save reports failure rather than silently
  // no-opping.
  GetPoByIdUrl: 'api/PoQueue/GetPoById',
  UpdatePoUrl: 'api/PoQueue/UpdatePo',
  GetCoByIdUrl: 'api/CoQueue/GetCoById',
  UpdateCoUrl: 'api/CoQueue/UpdateCo',

  // --- NEW - mockup update (client-updated Moqups, pages TAB-Invoices / FORM-PO Request
  // Approval / FORM-CO Request Approval / FORM-CO Reallocation / FORM-CO Allocation). None of
  // these 9 endpoints are backend-implemented yet (same "not confirmed" status as the
  // GetPoById/UpdatePo/GetCoById/UpdateCo block above) - added here only so the Angular
  // services/components have a real constant to call and a single place to update once the
  // backend exists. See each service's header comment for the specific gap. ---
  GetJobInvoicesUrl: 'api/Invoices/GetJobInvoices',
  GetPoRequestForApprovalUrl: 'api/PoQueue/GetPoRequestForApproval',
  ApprovePoRequestUrl: 'api/PoQueue/ApprovePoRequest',
  RejectPoRequestUrl: 'api/PoQueue/RejectPoRequest',
  GetCoRequestForApprovalUrl: 'api/CoQueue/GetCoRequestForApproval',
  ApproveCoRequestUrl: 'api/CoQueue/ApproveCoRequest',
  RejectCoRequestUrl: 'api/CoQueue/RejectCoRequest',
  // Real backend routes (CoBudgetAllocationController) - cost codes for the Budget Update grid
  // reuse PoQueueController.GetJobCostCodes instead of a dedicated endpoint (JobCostCodeService).
  SaveCoBudgetAllocationUrl: 'api/CoBudgetAllocation/Save',
  SubmitCoBudgetAllocationUrl: 'api/CoBudgetAllocation/Submit',
  GetCoBudgetAllocationByIdUrl: 'api/CoBudgetAllocation',
  // NEW - live preview of the number Submit would auto-assign (see CO_SubmitBudgetReallocation's
  // Prime="BC"+year+seq / Internal="CO"+year+seq rule); a preview only, not a reservation - the
  // real number is still (re)computed under lock at actual Submit time.
  GetNextCoBudgetAllocationNumberUrl: 'api/CoBudgetAllocation/NextNumber',
  // NEW (2026-09-20) - CO Reason / CO Status dropdown options straight from StowellSandbox, and
  // the full cost code catalog for the Budget Update "Cost Code" picker. See
  // CoBudgetAllocationController.GetLookups / GetAllCostCodes.
  GetCoBudgetAllocationLookupsUrl: 'api/CoBudgetAllocation/Lookups',
  GetCoBudgetAllocationAllCostCodesUrl: 'api/CoBudgetAllocation/AllCostCodes',
  // NEW (2026-09-24) - each cost code's budget per phase for a job; drives the form's pre-submit phase check.
  GetCoBudgetAllocationPhaseBudgetsUrl: 'api/CoBudgetAllocation/PhaseBudgets',

  // NEW - client-updated Moqups (page TAB-Budget/Financials, the "Budget Log" table). Not
  // backend-implemented yet - see budget-log.service.ts.
  GetBudgetLogUrl: 'api/ProjectBudgetConfiguration/GetBudgetLog',

  // NEW - job access audit trail (not a Blazor port; not a Moqups page either - an un-navigated
  // grid reachable only by direct URL). Real backend (JobAccessController) - see
  // job-access-log.service.ts and job-access-log.component.ts.
  LogJobAccessUrl: 'api/JobAccess/LogAccess',
  GetJobAccessLogUrl: 'api/JobAccess/GetLog',
} as const;
