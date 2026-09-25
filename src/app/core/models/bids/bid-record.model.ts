// Mirrors StowellCoApp.DTO.BidRecords (DTO/BidInfoDto.cs) - the full bid/project record shown
// across the BidOverview tabs. One record backs both BidQueueOverview.razor's "Overview" tab
// and BidProjectDetailsTab.razor's "Details" tab in the Blazor source (each independently
// fetched it via IBidService.GetBidById there); this Angular port fetches it once in
// BidOverviewComponent and passes it down to both tab components as an @Input - see that
// component's header comment for the reasoning and the flag around this consolidation.
export interface BidRecord {
  internalBidID: number;
  displayBidID: string;
  isProject: boolean;
  department?: string;
  division?: string;
  bidName?: string;
  bidPhase?: string;
  bidStatus?: string;
  jobsite?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  salesTaxDistrict?: string;
  clientName?: string;
  gcAddress1?: string;
  gcAddress2?: string;
  gcCity?: string;
  gcState?: string;
  gcZipCode?: string;
  gcSalesTaxDistrict?: string;
  documentFolderPath?: string;
  hasBidDocumentLibrary: boolean;
  createdDate?: string;
  createdBy?: string;
  modifiedDate?: string;
  insuranceType?: string;
  bonded?: string;
  taxExempt?: string;
  invoiceSubmittal?: string;
  certifiedPayroll?: string;
  netTermsDate?: string;
  retainagePercentage: number;
}

// Mirrors StowellCoApp.DTO.UpdateBidDetailsRequest - posted by the "Save Bid" button, which
// exists (near-identically duplicated) on both the Overview and Details tabs in the Blazor
// source (BidQueueOverviewTabBase.SaveBidData / BidProjectDetailsTabBase.SaveBidData).
//
// FLAG - likely bug found in the source, NOT reproduced here: both C# SaveBidData methods set
// `request.GC_ZipCode = _bidRecords.ZipCode` (the job-site zip, not `_bidRecords.GC_ZipCode`,
// the General Contractor zip) - looks like a copy/paste mistake. This Angular port maps
// gcZipCode from the record's own gcZipCode field instead of replicating the apparent bug -
// confirm with the user/API owner whether the original behavior was actually intentional.
export interface UpdateBidDetailsRequest {
  internalBidID: number;
  department?: string;
  division?: string;
  bidName?: string;
  bidPhase?: string;
  bidStatus?: string;
  jobsite?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  salesTaxDistrict?: string;
  clientName?: string;
  gcAddress1?: string;
  gcAddress2?: string;
  gcCity?: string;
  gcState?: string;
  gcZipCode?: string;
  gcSalesTaxDistrict?: string;
  insuranceType?: string;
  bonded?: string;
  taxExempt?: string;
  invoiceSubmittal?: string;
  certifiedPayroll?: string;
  netTermsDate?: string | null;
  retainagePercentage?: number | null;
  modifiedBy?: string;
  GC_Address1?: string;
  GC_Address2?: string;
  GC_City?: string;
  GC_State?: string;
  GC_ZipCode?: string;
  GC_SalesTaxDistrict?: string;
}

// Mirrors ConvertBidToProjectRequest / CloseBidAsLostRequest - single-field requests keyed off
// InternalBidID, used by the "Bid Won" / "Bid Lost" buttons (also duplicated across both tabs
// in the Blazor source).
export interface ConvertBidToProjectRequest {
  internalBidID: number;
  modifiedBy?: string;
}

export interface CloseBidAsLostRequest {
  internalBidID: number;
  modifiedBy?: string;
}
