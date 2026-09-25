// Mirrors StowellCoApp.DTO.ContractorClient (confirmed, DTO/CodeCodeSummaryRecord.cs -
// despite the filename, that file is a grab-bag of several DTO classes including this one).
// Double-duty in AddBid/EditBidForm: populates the General Contractor "Client" dropdown
// (GetAllContractorClients) AND, confusingly, the Project Resources "Employee" dropdown
// (GetAllEmployees also returns ContractorClient[], not EmployeeDetails[] - see
// EstimationService notes). Ported as-is; flagged in the service.
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
