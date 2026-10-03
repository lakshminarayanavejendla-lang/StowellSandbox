// Matches BidInfoDto and its nested classes in DTO/BidInfoDto.cs. Add Bid and Edit Bid build this
// and post it to SubmitBid or UpdateBid; Edit Bid loads it from GetBidDetails.
//
// project-management/bid-info.model.ts re-exports these for the Project Overview tabs.
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

// Number codes (0 to 3) for dropdown choices (the options are in BidFormComponent). Typed as
// string | number because the C# code converts them with ToString() and Convert.ToInt32, not an enum.
export interface ProjectInfoDto {
  jobID?: string;
  insuranceType?: string | number;
  bonded?: string | number;
  taxExcempt?: string | number; // sic - matches the C# property's typo (TaxExcempt, not TaxExempt)
  invoiceSubmittal?: string | number;
  certifiedPayroll?: string | number;
  netTermsDate?: string;
  retainagePerc?: string | number;
}

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
