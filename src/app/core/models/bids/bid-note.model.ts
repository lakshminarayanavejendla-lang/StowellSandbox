// The Notes table on the bid's Overview tab, which the user asked for. Blazor had no bid notes.
// The shape follows bid-amount.model.ts, the closest grid on the same tab. Check it against the
// backend.
export interface BidNote {
  noteId: number;
  internalBidID: number;
  noteDate?: string;
  note: string;
  enteredBy?: string;
}

// noteDate and enteredBy are filled in automatically with today's date and the signed-in user's
// name, not typed (see addNote() in bid-summary-tab.component.ts).
export interface AddBidNoteRequest {
  internalBidID: number;
  noteDate: string;
  note: string;
  enteredBy: string;
}

// Assumed camelCase like the rest of this module (see bid-amount.model.ts), but both casings are
// handled to be safe.
export interface AddBidNoteResponse {
  Message?: string;
  message?: string;

  NewNoteID?: number;
  newNoteID?: number;
  newNoteId?: number;
}
