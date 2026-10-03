// Matches DTO/BidInfoDto.cs and the BidAmount, BidPhase and BidEmployee models used by the Add
// Form's grids. These belong to Estimation, but Accounting's Add Form (shown when statusID is "99",
// a bid with no full budget yet) reads and writes them. This is a copy of the Estimation models;
// merge the two into one later.
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

// These are number codes with no enum in the C# code (see the option values in AddForm.razor).
// InsuranceType: 1 = OCIP, 2 = CCIP. Bonded, TaxExcempt, InvoiceSubmittal, CertifiedPayroll:
// 0 = not set, 1 = yes or the first option, 2 = no or the second option, 3 = third option
// (InvoiceSubmittal only).
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

// ContractorClient (also defined in CodeCodeSummaryRecord.cs): the General Contractor dropdown and
// its address fields.
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

// The SubmitToSage response. In C# it's a class inside AccountingService.cs, not in DTO or Models.
export interface SubmitToSageResponse {
  success: boolean;
  message?: string;
  isExist: boolean;
}

// The divisions, departments and job types lists, copied as-is from AddFormBase.cs. The division
// values are GUIDs that look like SharePoint or Graph group ids (not confirmed). These should
// probably come from an API.
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
