import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BidsEndpoints } from '../bids-endpoints';
import { AddBidNoteRequest, AddBidNoteResponse, BidNote } from '../models/bids/bid-note.model';

// NEW - see bid-note.model.ts header comment: not a Blazor port, endpoint contract unconfirmed.
// Mirrors bid-amount.service.ts's shape for the sibling "Bids" sub-grid on the same tab.
@Injectable({ providedIn: 'root' })
export class BidNoteService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getBidNotes(displayBidId: string): Observable<BidNote[]> {
    return this.http
      .get<BidNote[]>(`${this.base}${BidsEndpoints.GetBidNotesUrl}/${displayBidId}`)
      .pipe(catchError(() => of([])));
  }

  addBidNote(request: AddBidNoteRequest): Observable<{ message: string; newId: number }> {
    return this.http
      .post<AddBidNoteResponse>(`${this.base}${BidsEndpoints.AddBidNoteUrl}`, request)
      .pipe(
        map((res) => ({
          message: res?.Message ?? res?.message ?? '',
          newId: res?.NewNoteID ?? res?.newNoteID ?? res?.newNoteId ?? 0,
        })),
        catchError(() => of({ message: 'Unable to save note.', newId: 0 }))
      );
  }
}
