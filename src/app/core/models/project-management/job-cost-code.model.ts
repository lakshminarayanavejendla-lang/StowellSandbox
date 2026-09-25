// NEW - Stowell PO Module. Replaces free-text "Item" on FORM-PO Request / FORM-CO Request with a
// real dropdown scoped to the selected job's actual budget lines, carrying a computed Remaining
// Budget so that field can auto-fill and stay read-only (per the mockup's own design note).
export interface JobCostCodeOption {
  costCode: number;
  costCodeDescription: string;
  budget: number;
  toDate: number;
  remaining: number;
  // Client-computed "{costCode} - {costCodeDescription}" for the ComboBox's display field,
  // matching the mockup's "1000 - Cost Code Description" format.
  display?: string;
}
