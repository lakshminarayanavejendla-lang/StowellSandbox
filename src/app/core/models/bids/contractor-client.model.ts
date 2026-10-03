// Matches ContractorClient in DTO/CodeCodeSummaryRecord.cs. Estimation has its own copy
// (estimation/contractor-client.model.ts); each module keeps its own small copy.
//
// Fills the Client (General Contractor) dropdown on the bid Details tab. Blazor loaded it from the
// Estimation service; bid.service.ts calls the same route itself (see getAllContractorClients).
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
