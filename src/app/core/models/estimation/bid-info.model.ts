// Direct port of StowellCoApp.DTO.BidInfoDto and its nested Dto classes
// (confirmed against DTO/BidInfoDto.cs - not inferred). This is the payload shape
// AddBid/EditBidForm build up client-side and POST to SubmitBid/UpdateBid, and that
// EditBidForm reads back from GetBidDetails.
//
// NOTE: a similarly-named but partially-INFERRED BidInfoDto/ContractorInfo/ProjectInfo
// set of interfaces already exists at
// core/models/project-management/bid-info.model.ts (built by the parallel Project
// Management agent from usage in OverviewTab/ProjectDetailsTab, without access to this
// DTO file). The two are not identical - e.g. their ContractorInfo has no `zip`, and their
// ProjectInfo/BidInfoDto are missing several fields this file has (department, jobType,
// shortName, etc). Flagging so the two can be reconciled/consolidated later; not touching
// their file since it's outside this phase's scope.
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

// C# ints (0/1/2/3) used as codes for select-list choices (see BidFormComponent for the
// option lists). Kept as string|number since AddBidBase/EditBidFormBase round-trip them
// through ToString()/Convert.ToInt32 rather than a real enum.
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
