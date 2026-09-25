// NEW - Stowell PO Module. Replaces free-text Vendor fields on FORM-PO Request / FORM-CO Request
// with a real dropdown sourced from the Sage vendor master (actpay) - the exact table
// PO_SubmitRequest/CO_SubmitRequest already validate the typed vendor name against.
export interface VendorOption {
  recnum: number;
  vendorName: string;
}
