// INFERRED - StowellCoApp.DTO.ProjectBudgetQueueItem's class definition was never found in the
// DTO/Models files handed to this phase; fields below are only what
// ProjectBudgetConfiguration.razor's grid template binds (JobID, JobName, Address, Phase,
// Source - the last one drives the Sage vs local "CreateBudget"/"ModifyBudget" link branch).
// Confirm the full shape against the API before relying on any other field.
export interface ProjectBudgetQueueItem {
  jobID: string;
  jobName: string;
  address?: string;
  phase?: string;
  source?: string;
}

// Mirrors StowellCoApp.DTO.BudgetRecord (confirmed, DTO/CodeCodeSummaryRecord.cs).
export interface BudgetRecord {
  jobNumber: string;
  costCode?: string;
  costCodeDescription: string;
  totalBudget?: number;
  updateBudget?: number;
  phaseNum?: number;
  source?: string;
  email?: string;
  actionType?: string;
}

// Mirrors StowellCoApp.DTO.ApiResponse (confirmed, DTO/CodeCodeSummaryRecord.cs).
export interface ApiResponse {
  success: boolean;
  message?: string;
}

// INFERRED - CreateBudgetBase references StowellCoApp.Models.CostCodeList for the
// RadzenAutoComplete cost-code-description picker; that Models/CostCodeList.cs file wasn't
// among the source files staged for this phase. Description is the only field the template
// actually reads (TextProperty="Description").
export interface CostCodeList {
  id?: string;
  costCode?: string;
  description: string;
}
