// NEW model - Stowell PO Module (not a Blazor port; designed from the "Stowell PO Module"
// Moqups spec, page TAB-Job PO Overview - the new "$ PO" tab on the Project Overview page). No
// backend endpoint exists for this yet - see job-po.service.ts's header comment.
export interface PurchaseOrderRecord {
  poId: string;
  poDescription: string;
  status: string;
  dateSubmitted: string;
  requiredOnsite: string;
  vendor: string;
  // Sage phase number - lets the PO tab show one phase at a time (null/absent = no phase recorded).
  poPhase?: number | null;
}

export interface ChangeOrderLogRecord {
  coId: string;
  coDescription: string;
  coAmount: number;
  coStatus: string;
  coReason: string;
  // Sage phase number - lets the CO tab show one phase at a time (null/absent = no phase recorded).
  coPhase?: number | null;
}

export interface BackChargeLogRecord {
  bcId: string;
  bcDescription: string;
  bcAmount: number;
  bcStatus: string;
  bcReason: string;
}

export interface JobPoOverviewData {
  purchaseOrders: PurchaseOrderRecord[];
  changeOrderLog: ChangeOrderLogRecord[];
  backChargeLog: BackChargeLogRecord[];
}
