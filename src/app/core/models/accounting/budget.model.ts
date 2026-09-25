// Mirrors StowellCoApp.DTO.Phase / BudgetRecord / ApiResponse (DTO/CodeCodeSummaryRecord.cs)
// and StowellCoApp.DTO.CostCodeRecord, used by the budget approval (new + modify) flow and
// AddForm's "Additional Phases" popup.
export interface Phase {
  recnum?: string;
  phaseNum: string;
  phaseName: string;
  source?: string;
  email?: string;
}

// One row of the ApproveNewBudget / ApproveModifyBudget cost-code budget grid.
export interface BudgetRecord {
  jobNumber: string;
  costCode?: string;
  costCodeDescription: string;
  totalBudget?: number | null;
  updateBudget?: number | null;
  phaseNum?: number | null;
  source?: string;
  email?: string;
  actionType?: string;
}

// Job dropdown option for the budget approval pages (ICostCodeService.GetAllUserJobs()).
// RecJobNumber/RecNumber are C# computed properties (`$"{RecNum} - {JobNumber}"`); replicated
// here as plain fields rather than getters since this is a wire-shape mirror.
export interface CostCodeRecord {
  recNum: number;
  jobNumber: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  recNumber: string; // = recNum.toString()
  recJobNumber: string; // = `${recNum} - ${jobNumber}`
}

export interface ApiResponse {
  success: boolean;
  message?: string;
}

// api/CostCode/GetAllPhases wraps its payload as { data: [...] } server-side
// (ApiListResponse<Phase> in CostCodeService.cs), unlike the other CostCode/Accounting GETs
// which return bare arrays - confirm this is still true of the real controller before assuming it.
export interface PhaseListResponse {
  data: Phase[];
}
