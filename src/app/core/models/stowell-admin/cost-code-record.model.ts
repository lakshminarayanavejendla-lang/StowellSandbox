// Port of StowellCoApp.DTO.CostCodeRecord (DTO/CodeCodeSummaryRecord.cs - yes, that file holds
// ~20 unrelated DTOs despite its name, per this codebase's established pattern) - CONFIRMED read
// directly from source. Backs AdminPanelService.GetProjectIds() (api/AdminPanel/GetProjectIds,
// listed explicitly in Common/GlobalEndpoints.cs as GetProjectIdsUrl).
//
// FLAG: GetProjectIds() is on IAdminPanelService and wired in admin-panel.service.ts for
// completeness, but AdminPanelBase.cs (the only real StowellAdmin page with logic) never calls
// it - no dropdown/grid in AdminPanel.razor consumes CostCodeRecord. Appears orphaned in the
// source provided; not wired into any component here either. Confirm whether a "select project"
// picker still belongs on this page before building UI against it.
export interface CostCodeRecord {
  recNum: number;
  jobNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  // C# also exposes two computed (non-serialized-from-DB) getters: RecNumber => RecNum.ToString()
  // and RecJobNumber => `${RecNum} - ${JobNumber}`. Not real API fields - recreate as plain
  // template expressions/getters on the frontend if this type ever gets wired to a UI.
}
