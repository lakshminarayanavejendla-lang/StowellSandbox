// Matches BidRecords in DTO/BidInfoDto.cs: the full bid shown on the bid's Overview and Details
// tabs. Blazor loaded it separately in each tab. Here BidOverviewComponent loads it once and passes
// it to both (see that component's header).
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

// Matches UpdateBidDetailsRequest, sent by Save Bid on the Overview and Details tabs.
//
// Both C# SaveBidData methods set GC_ZipCode to the job-site ZipCode, not the contractor's
// GC_ZipCode, which looks like a copy-paste bug. This version sends gcZipCode from the record's
// gcZipCode. Confirm with the API owner that this is what they want.
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

// Matches ConvertBidToProjectRequest and CloseBidAsLostRequest: just the InternalBidID, sent by
// the Bid Won and Bid Lost buttons.
export interface ConvertBidToProjectRequest {
  internalBidID: number;
  modifiedBy?: string;
}

export interface CloseBidAsLostRequest {
  internalBidID: number;
  modifiedBy?: string;
}
