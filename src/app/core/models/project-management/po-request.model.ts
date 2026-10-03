// PO module, built from the Moqups design (page FORM-PO Request), not ported from Blazor. The old
// NewPOForm.razor was a static mock with different fields (see new-po-form.component.ts).
export interface PoRequestItem {
  item: string;
  remainingBudget: number;
  itemCost: number;
  itemNote: string;
  // Sent so each PO line links to its cost code in Sage's pcorln and counts against Remaining Budget
  // (see addItem() and editItem() in new-po-form.component.ts).
  costCode: number | null;
}

export interface PoBackCharge {
  vendor: string;
  percentCharge: number | null;
  dollarCharge: number;
  reason: string;
}

export interface PoRequestSubmission {
  jobId: string;
  jobName: string;
  requester: string;
  vendor: string;
  poDescription: string;
  dateRequested: string;
  requiredOnSite: string;
  totalPoAmount: number;
  // The signed-in user, which goes to Sage's pchord.usrnme for the audit trail. `requester` is just a
  // name the user types (2026-09-14).
  createdBy: string;
  // The Sage phase number, saved to pchord.phsnum. Optional on a draft, required to submit
  // (Moqups: "User must select Project Phase", 2026-09-23).
  phaseNumber?: number | null;
  items: PoRequestItem[];
  backCharges: PoBackCharge[];
}

// What SavePoRequest and SubmitPoRequest return. Check `error`, so a failed submit (for example a
// vendor that isn't in Sage) isn't shown as a success.
export interface PoSaveResult {
  saved: boolean;
  draftId?: number;
  error?: string;
}

export interface PoSubmitResult {
  submitted: boolean;
  /** Submitted POs now wait for Accounting approval: this is the approval request id (poId is only set once Sage creates the PO). */
  requestId?: number;
  status?: string;
  poId?: string;
  poRecNum?: number;
  error?: string;
}

// For editing a submitted PO from the "Master Job PO ID" link (GetPoById and UpdatePo). The same
// fields as PoRequestSubmission plus the poId.
export interface PoDetail extends PoRequestSubmission {
  poId: string;
}

export interface PoUpdateResult {
  saved: boolean;
  /** True when the edit was saved as a change request: the Sage PO only changes once Accounting approves. */
  pendingApproval?: boolean;
  requestId?: number;
  error?: string;
}

// For the PO approval view (Moqups page FORM-PO Request Approval): PoRequestSubmission plus poId,
// backCharges and status. It's read-only with Approve and Reject, unlike PoDetail, which is a full
// edit. They're kept separate because the two may need different fields later.
export interface PoApprovalDetail {
  poId: string;
  jobId: string;
  jobName: string;
  requester: string;
  vendor: string;
  poDescription: string;
  dateRequested: string;
  requiredOnSite: string;
  totalPoAmount: number;
  status: string;
  items: PoRequestItem[];
  backCharges: PoBackCharge[];
}

export interface PoApprovalActionResult {
  succeeded: boolean;
  error?: string;
}

/** A submitted PO waiting for Accounting approval (Accounting > PO Queue). */
export interface PendingPoApproval {
  requestId: number;
  jobId: string;
  jobName: string;
  vendor: string;
  poDescription: string;
  requester: string;
  createdBy: string;
  phaseNumber: number;
  totalAmount: number;
  submittedDate: string;
}
