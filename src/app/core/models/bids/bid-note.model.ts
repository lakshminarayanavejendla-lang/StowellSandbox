// NEW - Notes table on Bid Overview's Overview tab, requested directly by the user (not a
// Blazor port - grep of the staged Blazor source found no Notes feature for Bids at all, only
// an unrelated "Stowell OneNote.rdp" shortcut). Shape modeled on bid-amount.model.ts's sibling
// "Bids" sub-grid (same tab, same request/response conventions) as the closest real precedent
// in this codebase - CONFIRM against the backend before relying on it.
export interface BidNote {
  noteId: number;
  internalBidID: number;
  noteDate?: string;
  note: string;
  enteredBy?: string;
}

// noteDate/enteredBy are stamped automatically by the caller (today's date, the signed-in MSAL
// account's name) rather than user-editable - see bid-summary-tab.component.ts's addNote().
export interface AddBidNoteRequest {
  internalBidID: number;
  noteDate: string;
  note: string;
  enteredBy: string;
}

// Response shape assumed camelCase per this module's convention (see bid-amount.model.ts's
// AddBidAmountResponse header comment) - both casings kept defensively.
export interface AddBidNoteResponse {
  Message?: string;
  message?: string;

  NewNoteID?: number;
  newNoteID?: number;
  newNoteId?: number;
}
