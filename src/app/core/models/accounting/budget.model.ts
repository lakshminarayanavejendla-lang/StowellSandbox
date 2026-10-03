// Matches Phase, BudgetRecord, ApiResponse and CostCodeRecord from the DTO files. Used by budget
// approval (new and modify) and the Add Form's Additional Phases popup.
export interface Phase {
  recnum?: string;
  phaseNum: string;
  phaseName: string;
  source?: string;
  email?: string;
}

// One row of the cost code grid on the budget approval pages.
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

// A Job dropdown option on the budget approval pages (from GetAllUserJobs()). RecJobNumber and
// RecNumber are calculated in C# (`$"{RecNum} - {JobNumber}"`) but are plain fields here because
// they come in the JSON.
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

// api/CostCode/GetAllPhases comes wrapped as { data: [...] } (ApiListResponse<Phase>), unlike the
// other CostCode and Accounting calls, which return a plain array. Check the real API.
export interface PhaseListResponse {
  data: Phase[];
}
