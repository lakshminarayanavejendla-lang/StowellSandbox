// Matches ContractorClient in DTO/CodeCodeSummaryRecord.cs. On Add Bid and Edit Bid it fills the
// General Contractor dropdown (GetAllContractorClients) and, oddly, the Project Resources Employee
// dropdown too, because GetAllEmployees also returns ContractorClient[] (see EstimationService).
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
