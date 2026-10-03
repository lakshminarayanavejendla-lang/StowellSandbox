// PO module, built from the Moqups design (page TAB-Job PO Overview, the "$ PO" tab on Project
// Overview), not ported from Blazor. See job-po.service.ts for where the data comes from.
export interface PurchaseOrderRecord {
  poId: string;
  poDescription: string;
  status: string;
  dateSubmitted: string;
  requiredOnsite: string;
  vendor: string;
  // Sage phase number, so the PO tab can show one phase at a time (missing if no phase was recorded).
  poPhase?: number | null;
}

export interface ChangeOrderLogRecord {
  coId: string;
  coDescription: string;
  coAmount: number;
  coStatus: string;
  coReason: string;
  // Sage phase number, so the CO tab can show one phase at a time (missing if no phase was recorded).
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
