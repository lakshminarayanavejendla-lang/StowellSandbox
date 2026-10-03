// PO module, built from the Moqups design (page FORM-CO Request). Works like po-request.model.ts:
// the same items and back-charges lines, plus a Purchase Order picker that links the CO to one of
// the job's POs.
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
  // The signed-in user, not `requester`, which is just a typed name (2026-09-14; see po-request.model.ts).
  createdBy: string;
  items: CoRequestItem[];
  backCharges: CoBackCharge[];
}

// What the save and submit calls return (see PoSaveResult and PoSubmitResult in po-request.model.ts).
export interface CoSaveResult {
  saved: boolean;
  draftId?: number;
  error?: string;
}

export interface CoSubmitResult {
  submitted: boolean;
  /** Submitted COs now wait for Accounting approval: this is the approval request id (coId is only set once Sage creates the CO). */
  requestId?: number;
  status?: string;
  coId?: string;
  coRecNum?: number;
  error?: string;
}

// For editing a submitted CO from the "Master Job CO ID" link (GetCoById and UpdateCo). The same
// fields as CoRequestSubmission plus the coId.
export interface CoDetail extends CoRequestSubmission {
  coId: string;
}

export interface CoUpdateResult {
  saved: boolean;
  /** True when the edit was saved as a change request: the Sage change order only changes once Accounting approves. */
  pendingApproval?: boolean;
  requestId?: number;
  error?: string;
}

// For the CO approval view (Moqups page FORM-CO Request Approval). Same idea as PoApprovalDetail in
// po-request.model.ts, and separate from CoDetail above.
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

/** A submitted CO waiting for Accounting approval (Accounting > CO Queue). */
export interface PendingCoApproval {
  requestId: number;
  jobId: string;
  jobName: string;
  purchaseOrderId: string;
  vendor: string;
  coReason: string;
  requester: string;
  createdBy: string;
  totalAmount: number;
  submittedDate: string;
}
