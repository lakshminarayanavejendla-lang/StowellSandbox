// API routes for Project Management. Kept apart from core/global-endpoints.ts so the modules
// converted in parallel didn't collide.
//
// Where each route comes from:
//  1. StowellCoApp.Common.GlobalEndpoints, the C# constants class. These are exact.
//  2. String literals inside the C# services (CostCodeService.cs, ProjectBudget.cs,
//     ReportingServices.cs). The Blazor app calls them today, but they aren't in GlobalEndpoints.cs.
//     It would be worth adding them there.
//  3. Two routes that are guesses (GetAllContractorClients, GetPhases). The C# code reaches them
//     through IEstimationService, whose source we don't have. Confirm before relying on them.
export const ProjectManagementEndpoints = {
  // --- From GlobalEndpoints ---
  GetCurrentCostSummaryViewModelUrl: 'api/ProjectOverview/GetCurrentCostSummaryViewModel',
  GetJobDetailsUrl: 'api/ProjectOverview/GetJobDetails',
  GetJobCostSummaryRecordsUrl: 'api/JobSummary/GetJobCostSummaryRecords',
  GetJobCostSummaryRecordsWithRecnumUrl: 'api/JobSummary/GetJobCostSummaryRecordsWithRecnum',
  GetAllStatusesDataUrl: 'api/CostCode/GetAllStatusesData',
  GetAllUserJobsByStatusUrl: 'api/CostCode/GetAllUserJobsByStatus',
  GetCashFlowAllDataByPeriodUrl: 'api/CashFlow/CashFlowAllDataByPeriod',
  GetAllUserJobsUrl: 'api/CostCode/GetAllUserJobs',
  // "Mulitple" is spelled this way on the server too.
  CashFlowAllDataByMulitpleJobsAndPeriodUrl: 'api/CashFlow/CashFlowAllDataByMulitpleJobsAndPeriod',
  GetBidDetailsUrl: 'api/Estimation/GetBidDetails',
  GetEmployeesUrl: 'api/Estimation/GetEmployees',

  // --- From string literals in the C# services ---
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
  // Not the same as GetCurrentCostSummaryViewModelUrl above. This one is used by the Cost Code
  // Summary report and takes recnum, costCode, phase, startDate and endDate in the query string.
  GetCurrentCostSummaryViewModel1Url: 'api/CostCodeSummary/GetCurrentCostSummaryViewModel1',
  GetProjectBudgetRecordsUrl: 'api/ProjectBudgetConfiguration/GetProjectBudgetRecords',
  SaveCreateBatchCostCodesUrl: 'api/ProjectBudgetConfiguration/SaveCreateBatchCostCodes',
  SubmitBatchCostCodesUrl: 'api/ProjectBudgetConfiguration/SubmitBatchCostCodes',
  GetCostCodesAsyncUrl: 'api/ProjectBudgetConfiguration/GetCostCodesAsync',
  UploadAddExcelUrl: 'api/ProjectBudgetConfiguration/UploadAddExcel',
  GetCashFlowForecastReportDataUrl: 'api/Reports/GetCashFlowForecastReportData',

  // --- Guesses, not confirmed (see the note at the top) ---
  GetAllContractorClientsUrl: 'api/Estimation/GetAllContractorClients',
  GetEstimationPhasesUrl: 'api/Estimation/GetPhases',

  // --- PO module (built from the "Stowell PO Module" Moqups design, not ported from Blazor) ---
  // All of these exist in PoQueueController.cs and CoQueueController.cs. The reads join SAGESBQ to
  // the real Sage PO/CO tables in StowellSandbox (pchord, prmchg). Save writes only to draft tables
  // in SAGESBQ, so nothing reaches Sage. Submit is the one call that creates a real, numbered PO or
  // CO in StowellSandbox (pchord/pcorln, prmchg/sbcgln). po_module_write_side.sql has the design
  // notes and known gaps; for example, vendor and cost code are still free text on the form.
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

  // --- Editing a PO or CO that was already submitted. Not on the server yet. ---
  // Used when a Master Job PO/CO ID link in the queues opens the edit form
  // (PoQueueController.GetPoById / UpdatePo, CoQueueController.GetCoById / UpdateCo).
  GetPoByIdUrl: 'api/PoQueue/GetPoById',
  UpdatePoUrl: 'api/PoQueue/UpdatePo',
  GetCoByIdUrl: 'api/CoQueue/GetCoById',
  UpdateCoUrl: 'api/CoQueue/UpdateCo',

  // --- From the updated Moqups (Invoices tab, PO/CO approval forms, CO allocation forms) ---
  // Invoices (InvoicesController) and PO/CO approval (PoQueueController, CoQueueController).
  GetJobInvoicesUrl: 'api/Invoices/GetJobInvoices',
  GetPoRequestForApprovalUrl: 'api/PoQueue/GetPoRequestForApproval',
  ApprovePoRequestUrl: 'api/PoQueue/ApprovePoRequest',
  RejectPoRequestUrl: 'api/PoQueue/RejectPoRequest',
  GetCoRequestForApprovalUrl: 'api/CoQueue/GetCoRequestForApproval',
  ApproveCoRequestUrl: 'api/CoQueue/ApproveCoRequest',
  RejectCoRequestUrl: 'api/CoQueue/RejectCoRequest',
  // These are real (CoBudgetAllocationController). The Budget Update grid gets its cost codes from
  // PoQueueController.GetJobCostCodes (JobCostCodeService).
  SaveCoBudgetAllocationUrl: 'api/CoBudgetAllocation/Save',
  SubmitCoBudgetAllocationUrl: 'api/CoBudgetAllocation/Submit',
  GetCoBudgetAllocationByIdUrl: 'api/CoBudgetAllocation',
  // Previews the number Submit would give: Prime is "BC" + year + sequence, Internal is "CO" + year
  // + sequence. It doesn't reserve it; Submit works the number out again under a lock.
  GetNextCoBudgetAllocationNumberUrl: 'api/CoBudgetAllocation/NextNumber',
  // CO Reason and CO Status options from StowellSandbox, and every cost code for the Budget Update
  // picker (CoBudgetAllocationController.GetLookups / GetAllCostCodes). Added 2026-09-20.
  GetCoBudgetAllocationLookupsUrl: 'api/CoBudgetAllocation/Lookups',
  GetCoBudgetAllocationAllCostCodesUrl: 'api/CoBudgetAllocation/AllCostCodes',
  // Each cost code's budget per phase for a job, used by the form's check before Submit. Added 2026-09-24.
  GetCoBudgetAllocationPhaseBudgetsUrl: 'api/CoBudgetAllocation/PhaseBudgets',

  // The Budget Log table on the Budget tab. Not on the server yet (see budget-log.service.ts).
  GetBudgetLogUrl: 'api/ProjectBudgetConfiguration/GetBudgetLog',

  // Who opened which job. Real (JobAccessController). It isn't in the menu, so you reach the page by
  // URL or from Stowell Admin. See job-access-log.service.ts and job-access-log.component.ts.
  LogJobAccessUrl: 'api/JobAccess/LogAccess',
  GetJobAccessLogUrl: 'api/JobAccess/GetLog',
} as const;
