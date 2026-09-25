// Mirrors DTO/BidInfoDto.cs and the StowellCoApp.Models.BidAmount/BidPhase/BidEmployee
// classes AddForm.razor's sub-grids operate on. These are domain objects primarily owned by
// the Estimation module (IEstimationService) - AddForm (an Accounting page, routed for
// AccountingItem.statusID === "99", i.e. a bid not yet onboarded into a full budget) reads
// and writes them directly. Duplicated here rather than imported from an Estimation module
// path to avoid cross-agent file collisions during parallel conversion; reconcile with
// whatever core/models the Estimation-module agent creates once both phases land - these two
// sets of interfaces need to converge on one source of truth.
export interface BidInfoDto {
  jobID: string;
  bidder?: string;
  phase?: string;
  bidStatus?: string;
  division?: string;
  department?: string;
  jobType?: string;
  jobName?: string;
  shortName?: string;
  contractNumber?: string;
  contractDate?: string;
  contractAmount?: number;
  estStartDate?: string;
  estCompletionDate?: string;
  projectLocation?: ProjectLocationDto;
  contractorInfo?: ContractorInfoDto;
  projectInfo?: ProjectInfoDto;
}

export interface ProjectLocationDto {
  jobID?: string;
  jobsite?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  salesTaxDistrict?: string;
}

export interface ContractorInfoDto {
  jobID?: string;
  client?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

// Numeric-coded fields (InsuranceType 1=OCIP/2=CCIP, Bonded/TaxExcempt/InvoiceSubmittal/
// CertifiedPayroll 0=unset/1=yes-or-first-option/2=no-or-second-option/3=third option for
// InvoiceSubmittal) - see the <select> option values in AddForm.razor, they were never backed
// by a named enum in the C# source.
export interface ProjectInfoDto {
  jobID?: string;
  insuranceType?: number;
  bonded?: number;
  taxExcempt?: number;
  invoiceSubmittal?: number;
  certifiedPayroll?: number;
  netTermsDate?: string;
  retainagePerc?: number;
}

// StowellCoApp.DTO.ContractorClient (also defined inline in CodeCodeSummaryRecord.cs) - the
// "General Contractor Information" client dropdown + its address fields.
export interface ContractorClient {
  id?: number;
  name?: string;
  shortName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

// Models/BidAmount.cs
export interface BidAmount {
  id: number;
  jobId: string;
  bidDate?: string; // DateOnly on the wire
  bidAmount1?: number; // C# property is literally "BidAmount1" (collision with class BidAmount)
  isDeleted?: boolean;
  deletedDate?: string;
}

// Models/BidPhase.cs
export interface BidPhase {
  id: number;
  jobId: string;
  phase?: string;
  description?: string;
  isDeleted?: boolean;
  deletedDate?: string;
}

// Models/BidEmployee.cs
export interface BidEmployee {
  id: number;
  jobId: string;
  role?: string;
  employee?: string;
  isDeleted?: boolean;
  deletedDate?: string;
  employeeId?: number;
}

// AccountingService.cs declares this as a nested class alongside AccountingService itself
// (not in DTO/Models) - the SubmitToSage response shape.
export interface SubmitToSageResponse {
  success: boolean;
  message?: string;
  isExist: boolean;
}

// AddFormBase.cs's hardcoded `divisions` list (GUID-valued in the source - these look like
// SharePoint/Graph group IDs rather than a Division table row, unconfirmed) and the
// `departments`/`jobTypes` cascading dropdown data. Reproduced verbatim; flag anything that
// looks like it should come from an API instead of being hardcoded in the component.
export interface DivisionOption {
  value: string;
  text: string;
}

export const ACCOUNTING_DIVISIONS: DivisionOption[] = [
  { value: 'BlockConcreteGroupId', text: 'BlockConcrete' },
  { value: 'a539add2-52ab-4545-acb6-5d23c703403f', text: 'Jacksonville' },
  { value: '0a6836b5-aa1f-4c7e-b1e9-77be7b5a85d1', text: 'Naples' },
  { value: '3d76dbfb-27c8-4c95-836e-e5caed001a0b', text: 'Orlando' },
  { value: 'b222364a-0ca8-4415-ac9e-36ba0bfcabe1', text: 'Tampa' },
  { value: '1446eb90-6189-47cf-b242-b6f84f9f1d56', text: 'Texas' },
];

export const ACCOUNTING_JOB_PHASES = ['RFI', 'Estimate', 'Bid', 'Project'] as const;
export const ACCOUNTING_BID_STATUSES = ['Open Bid', 'Won', 'Lost', 'Pending'] as const;
export const ACCOUNTING_DEPARTMENTS = ['Drywall', 'Concrete'] as const;
export const ACCOUNTING_JOB_TYPES_BY_DEPARTMENT: Record<string, string[]> = {
  Drywall: ['Apartment', 'Condo', 'Medical', 'Residential'],
  Concrete: ['Block', 'Tilt Up', 'Foundation'],
};
export const ACCOUNTING_EMPLOYEE_ROLES = ['Sr. PM', 'PM'] as const;
