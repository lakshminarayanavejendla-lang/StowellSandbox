// Mirrors StowellCoApp.Models.CostCodeList (Models/CostCodeList.cs) - the cost-code
// description autocomplete source for the budget approval grids
// (IAccountingService.GetCostCodes(filter)).
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
