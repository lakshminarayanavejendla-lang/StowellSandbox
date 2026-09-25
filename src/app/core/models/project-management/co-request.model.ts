// NEW - Stowell PO Module (from the "Stowell PO Module" Moqups design spec, page
// FORM-CO Request). Mirrors po-request.model.ts - the CO Request form is the same
// items/back-charges line-item pattern as the PO Request form, plus a Purchase Order picker that
// links the change order back to an existing PO for the selected job.
export interface CoRequestItem {
  item: string;
  remainingBudget: number;
  itemCost: number;
  itemNote: string;
}

export interface CoBackCharge {
  vendor: string;
  percentCharge: number | null;
  dollarCharge: number;
  reason: string;
}

export interface CoRequestSubmission {
  jobId: string;
  jobName: string;
  purchaseOrderId: string;
  requester: string;
  vendor: string;
  coReason: string;
  dateRequested: string;
  requiredOnSite: string;
  totalCoAmount: number;
  // NEW (2026-09-14) - see po-request.model.ts's PoRequestSubmission.createdBy comment; same
  // fix, same reason (distinct from `requester`, a free-text field).
  createdBy: string;
  items: CoRequestItem[];
  backCharges: CoBackCharge[];
}

// Real backend response shapes - see po-request.model.ts's PoSaveResult/PoSubmitResult for why
// these replace the previous (wrong) Observable<boolean> typing.
export interface CoSaveResult {
  saved: boolean;
  draftId?: number;
  error?: string;
}

export interface CoSubmitResult {
  submitted: boolean;
  coId?: string;
  coRecNum?: number;
  error?: string;
}

// NEW - edit-on-click for an already-submitted CO (see co-queue.component.html/po-tab's
// "Master Job CO ID" link). No backend endpoint exists for GetCoById/UpdateCo yet - see
// co-request.service.ts's getCoById/updateCo header comment. Shape assumed to match
// CoRequestSubmission (the same fields the create form already edits) plus the real coId.
export interface CoDetail extends CoRequestSubmission {
  coId: string;
}

export interface CoUpdateResult {
  saved: boolean;
  error?: string;
}

// NEW - mockup update, page FORM-CO Request Approval. Mirrors po-request.model.ts's
// PoApprovalDetail/PoApprovalActionResult - see that file's comment (distinct from CoDetail
// above, the separate edit-on-click feature).
export interface CoApprovalDetail {
  coId: string;
  jobId: string;
  jobName: string;
  purchaseOrderId: string;
  requester: string;
  vendor: string;
  coReason: string;
  dateRequested: string;
  requiredOnSite: string;
  totalCoAmount: number;
  status: string;
  items: CoRequestItem[];
  backCharges: CoBackCharge[];
}

export interface CoApprovalActionResult {
  succeeded: boolean;
  error?: string;
}
