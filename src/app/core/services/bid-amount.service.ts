import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BidsEndpoints } from '../bids-endpoints';
import {
  AddBidAmountRequest,
  AddBidAmountResponse,
  BidAmount,
  DeleteBidAmountRequest,
  UpdateBidAmountRequest,
} from '../models/bids/bid-amount.model';
import { SimpleResponse } from '../models/bids/simple-response.model';
import { BidRecord } from '../models/bids/bid-record.model';

// Port of IBidService/BidService.cs's Bid Amounts methods - the "Bids" history sub-grid on
// BidOverview's Overview tab. Split out from bid.service.ts since it's a clearly separate
// sub-resource.
@Injectable({ providedIn: 'root' })
export class BidAmountService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

 getBidAmounts(displayBidId: string): Observable<BidAmount[]> {
  debugger;
  return this.http.get<BidAmount[]>(
    `${this.base}${BidsEndpoints.GetBidAmountsUrl}/${displayBidId}`
  );
}

addBidAmount(
  request: AddBidAmountRequest
): Observable<{ message: string; newId: number }> {

  return this.http
    .post<AddBidAmountResponse>(
      `${this.base}${BidsEndpoints.AddBidAmountUrl}`,
      request
    )
    .pipe(
      map((res) => {

        console.log('Raw API response:', res);

        // Handle ASP.NET response without changing the API
        const newId =
          res?.NewBidAmountID ??
          res?.newBidAmountID ??
          res?.newBidAmountId ??
          0;

        const message =
          res?.Message ??
          res?.message ??
          '';

        return {
          message,
          newId
        };
      }),

      catchError((error) => {
        console.error('AddBidAmount API error:', error);
        return throwError(() => error);
      })
    );
}

  updateBidAmount(request: UpdateBidAmountRequest): Observable<string> {
    debugger;
    return this.http
      .put<SimpleResponse>(`${this.base}${BidsEndpoints.UpdateBidAmountUrl}`, request)
      .pipe(
        map((res) => res?.message ?? 'Success'),
        catchError(() => of('Error'))
      );
  }

 deleteBidAmount(
  request: DeleteBidAmountRequest
): Observable<string> {

  console.log('DeleteBidAmount request:', request);

  return this.http
    .request<SimpleResponse>(
      'DELETE',
      `${this.base}${BidsEndpoints.DeleteBidAmountUrl}`,
      {
        body: request
      }
    )
    .pipe(
      map((res) => {

        console.log('DeleteBidAmount API response:', res);

        return (
          res?.Message ??
          res?.message ??
          'Success'
        );
      }),

      catchError((error) => {

        console.error(
          'DeleteBidAmount API error:',
          error
        );

        return throwError(() => error);
      })
    );
}
}
