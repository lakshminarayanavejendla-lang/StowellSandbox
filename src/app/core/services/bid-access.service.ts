import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BidsEndpoints } from '../bids-endpoints';
import {
  AddBidAccessRequest,
  AddBidAccessResponse,
  BidAccessSummary,
  RemoveBidAccessRequest,
} from '../models/bids/bid-access.model';
import { SimpleResponse } from '../models/bids/simple-response.model';

// Port of IBidService/BidService.cs's Bid Access methods - the "Bid Access" (role/employee)
// sub-grid on BidOverview's Details tab. Split out from bid.service.ts since it's a clearly
// separate sub-resource.
@Injectable({ providedIn: 'root' })
export class BidAccessService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getBidAccessSummary(displayBidId: string): Observable<BidAccessSummary[]> {
    return this.http
      .get<BidAccessSummary[]>(`${this.base}${BidsEndpoints.GetBidAccessSummaryUrl}/${displayBidId}`)
      .pipe(catchError(() => of([])));
  }

addBidAccess(
  request: AddBidAccessRequest
): Observable<{ message: string; newId: number }> {

  console.log('AddBidAccess request:', request);

  return this.http
    .post<AddBidAccessResponse>(
      `${this.base}${BidsEndpoints.AddBidAccessUrl}`,
      request
    )
    .pipe(
      map((res) => {

        console.log('AddBidAccess API response:', res);

        const newId =
          res?.newBidAccessID ??
          res?.NewBidAccessID ??
          0;

        const message =
          res?.message ??
          res?.Message ??
          '';

        return {
          message,
          newId: Number(newId)
        };
      }),

      catchError((error) => {

        console.error('AddBidAccess API error:', error);

        return of({
          message:
            error?.error?.message ??
            error?.error?.Message ??
            'Error adding bid access',
          newId: 0
        });
      })
    );
}

removeBidAccess(request: RemoveBidAccessRequest): Observable<string> {

  console.log('RemoveBidAccess request:', request);

  return this.http
    .request<any>(
      'DELETE',
      `${this.base}${BidsEndpoints.RemoveBidAccessUrl}`,
      {
        body: request
      }
    )
    .pipe(
      map((res) => {

        console.log('RemoveBidAccess API response:', res);

        return (
          res?.message ??
          res?.Message ??
          'Success'
        );
      }),

      catchError((error) => {

        console.error(
          'RemoveBidAccess API error:',
          error
        );

        return of(
          error?.error?.message ??
          error?.error?.Message ??
          'Error'
        );
      })
    );
}
}
