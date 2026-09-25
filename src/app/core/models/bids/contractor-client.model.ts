// Mirrors StowellCoApp.DTO.ContractorClient - CONFIRMED at DTO/CodeCodeSummaryRecord.cs
// (despite that file's name, it's a grab-bag of several DTO classes including this one; the
// Estimation module's parallel Angular port already found and modeled the same class at
// core/models/estimation/contractor-client.model.ts - duplicated here rather than imported
// cross-module, matching this app's existing pattern of small per-module duplication over
// cross-module imports).
//
// Used here by BidProjectDetailsTab.razor's "Client" (General Contractor) dropdown, which in
// the Blazor source is populated by IEstimationService.GetAllContractorClients() - a
// cross-module call into the Estimation service. See bid.service.ts's getAllContractorClients
// for how that's wired (duplicating Estimation's GetAllContractorClientsUrl route rather than
// depending on that module's Angular service directly).
export interface ContractorClient {
  id: number;
  name: string;
  shortName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}
