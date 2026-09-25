// NEW - Stowell PO Module (from the "Stowell PO Module" Moqups design spec, page
// FORM-PO Request, not a Blazor port - the Blazor NewPOForm.razor this route used to serve was a
// static, unbound mock with a different field set entirely; see new-po-form.component.ts header).
export interface PoRequestItem {
  item: string;
  remainingBudget: number;
  itemCost: number;
  itemNote: string;
  // FIX - was never sent to the backend, so submitted PO line items had no cost-code linkage in
  // Sage's own pcorln table and never counted against Remaining Budget. See addItem()/editItem()
  // in new-po-form.component.ts.
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
  // NEW (2026-09-14) - the real authenticated app user, distinct from `requester` (a free-text
  // business field the user types, with no connection to who's actually logged in). This is what
  // now feeds Sage's pchord.usrnme for a trustworthy audit trail.
  createdBy: string;
  // NEW (2026-09-23, Moqups FORM-PO Request: "User must select Project Phase") - the Sage phase
  // number; written to pchord.phsnum on submit/update. Optional on a draft, required to submit.
  phaseNumber?: number | null;
  items: PoRequestItem[];
  backCharges: PoBackCharge[];
}

// Real backend response shapes (PoQueueController.SavePoRequest/SubmitPoRequest) - previously
// mistyped as Observable<boolean> even though the actual JSON body is an object; the component
// never checked the result, so a failed submit (e.g. vendor not found in Sage) still showed a
// success message. Fixed by typing these for real and surfacing `error` on failure.
export interface PoSaveResult {
  saved: boolean;
  draftId?: number;
  error?: string;
}

export interface PoSubmitResult {
  submitted: boolean;
  poId?: string;
  poRecNum?: number;
  error?: string;
}

// NEW - edit-on-click for an already-submitted PO (see po-queue.component.html/co-tab's
// "Master Job PO ID" link). No backend endpoint exists for GetPoById/UpdatePo yet - see
// po-request.service.ts's getPoById/updatePo header comment. Shape assumed to match
// PoRequestSubmission (the same fields the create form already edits) plus the real poId.
export interface PoDetail extends PoRequestSubmission {
  poId: string;
}

export interface PoUpdateResult {
  saved: boolean;
  error?: string;
}

// NEW - mockup update, page FORM-PO Request Approval. Same submission shape as
// PoRequestSubmission plus the fields the approval view needs to render (poId, backCharges,
// current status) - a previously-submitted PO's detail, not a draft. Distinct from PoDetail
// above (the edit-on-click feature): approval is read-only + Approve/Reject, edit is a full
// re-save of the PO - kept as separate shapes since the two flows may diverge in what they need.
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
