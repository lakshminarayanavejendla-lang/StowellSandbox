// Matches Models/CostCodeList.cs: the cost code descriptions for the autocomplete in the budget
// approval grids (GetCostCodes(filter)).
export interface CostCodeList {
  id: number;
  costCodeDescription: string;
  shortDescription?: string;
  preferredCode?: number;
  createdDate: string;
  createdBy: string;
  modifiedDate?: string;
  modifiedBy?: string;
  description: string;
}
