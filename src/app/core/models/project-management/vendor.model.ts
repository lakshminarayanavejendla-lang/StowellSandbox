// The vendor dropdown on the PO Request and CO Request forms, in place of free text. It comes from
// Sage's vendor list (actpay), the same table PO_SubmitRequest and CO_SubmitRequest check against.
export interface VendorOption {
  recnum: number;
  vendorName: string;
}
