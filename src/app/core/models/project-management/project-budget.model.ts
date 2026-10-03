// Guessed: the ProjectBudgetQueueItem class wasn't in the files we had. These are only the fields
// the Project Budget Configuration grid shows: JobID, JobName, Address, Phase and Source. Source
// decides whether the link opens CreateBudget or ModifyBudget (Sage or local). Check the full shape
// before using anything else.
export interface ProjectBudgetQueueItem {
  jobID: string;
  jobName: string;
  address?: string;
  phase?: string;
  source?: string;
}

// Matches BudgetRecord in DTO/CodeCodeSummaryRecord.cs.
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

// Matches ApiResponse in DTO/CodeCodeSummaryRecord.cs.
export interface ApiResponse {
  success: boolean;
  message?: string;
}

// Guessed: Models/CostCodeList.cs wasn't in the files we had. The cost code description picker on
// Create Budget only reads Description.
export interface CostCodeList {
  id?: string;
  costCode?: string;
  description: string;
}
