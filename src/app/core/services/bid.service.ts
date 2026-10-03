import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BidsEndpoints } from '../bids-endpoints';
import { Bid, BidQueueData } from '../models/bids/bid.model';

import {
  BidRecord,
  UpdateBidDetailsRequest,
  ConvertBidToProjectRequest,
  CloseBidAsLostRequest,
} from '../models/bids/bid-record.model';
import { CreateBidRequest } from '../models/bids/create-bid-request.model';
import { Employee } from '../models/bids/employee.model';
import { ContractorClient } from '../models/bids/contractor-client.model';
import { ConvertBidResponse, NextDisplayBidIdResponse, SimpleResponse } from '../models/bids/simple-response.model';

/**
 * Bids, from BidService.cs: the bid list and queue, loading and saving one bid, marking it won or
 * lost, creating a bid, and two lookups for the Details tab. Bid amounts and bid access have their
 * own services (bid-amount.service.ts, bid-access.service.ts).
 *
 * In Blazor the server filled CreatedBy and ModifiedBy from the signed-in user. Until the API reads
 * the user from the sign-in token, callers here pass an empty value. Confirm with the API team.
 */
@Injectable({ providedIn: 'root' })
export class BidService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getCurrentBids(): Observable<Bid[]> {
    return this.http
      .get<Bid[]>(`${this.base}${BidsEndpoints.GetCurrentBidsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getBidQueueData(): Observable<BidQueueData> {
    return this.http
      .get<BidQueueData>(`${this.base}${BidsEndpoints.GetBidQueueDataUrl}`)
      .pipe(catchError(() => of({ currentBids: [], closedBids: [] })));
  }

 getBidById(displayBidId: string): Observable<BidRecord | null> {
  console.log('API URL:', `${this.base}${BidsEndpoints.GetBidByIdUrl}/${displayBidId}`);

  return this.http
    .get<BidRecord>(
      `${this.base}${BidsEndpoints.GetBidByIdUrl}/${displayBidId}`
    )
    .pipe(
      map((bid) => (bid ? this.normalizeBid(bid) : bid)),
      catchError((error) => {
        console.error('GetBidById API error:', error);
        return of(null);
      })
    );
}

  // The API sends the general contractor fields as gC_Address1, gC_City and so on, but the app reads
  // gcAddress1, gcCity. Without this they loaded blank, and Save Bid wrote the blanks back over the
  // saved values (Mike Smith, 2026-09-24). netTermsDate also comes as "2027-01-15T00:00:00", which a
  // date input can't show. Both are fixed here, once, for every tab.
  private normalizeBid(raw: BidRecord): BidRecord {
    const r = raw as any;
    return {
      ...raw,
      gcAddress1: r.gcAddress1 ?? r.gC_Address1 ?? r.GC_Address1 ?? '',
      gcAddress2: r.gcAddress2 ?? r.gC_Address2 ?? r.GC_Address2 ?? '',
      gcCity: r.gcCity ?? r.gC_City ?? r.GC_City ?? '',
      gcState: r.gcState ?? r.gC_State ?? r.GC_State ?? '',
      gcZipCode: r.gcZipCode ?? r.gC_ZipCode ?? r.GC_ZipCode ?? '',
      gcSalesTaxDistrict: r.gcSalesTaxDistrict ?? r.gC_SalesTaxDistrict ?? r.GC_SalesTaxDistrict ?? '',
      netTermsDate: r.netTermsDate ? String(r.netTermsDate).slice(0, 10) : r.netTermsDate,
    };
  }

  createNewBid(request: CreateBidRequest): Observable<boolean> {
    return this.http
      .post(`${this.base}${BidsEndpoints.CreateNewBidUrl}`, request, { observe: 'response' })
      .pipe(
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  updateBidDetails(request: UpdateBidDetailsRequest): Observable<boolean> {

  console.log('UpdateBidDetails request:', request);

  return this.http
    .post<any>(
      `${this.base}${BidsEndpoints.UpdateBidDetailsUrl}`,
      request
    )
    .pipe(
      map((res) => {
        console.log('UpdateBidDetails API response:', res);

        return true;
      }),
      catchError((error) => {

        console.error('UpdateBidDetails API error:', error);

        return throwError(() => error);
      })
    );
}

  convertBidToProject(request: ConvertBidToProjectRequest): Observable<{ message: string; newProjectID: string }> {
    return this.http
      .post<ConvertBidResponse>(`${this.base}${BidsEndpoints.ConvertBidToProjectUrl}`, request)
      .pipe(
        map((res) => ({ message: res?.message ?? '', newProjectID: res?.newProjectID ?? '' })),
        // Show the API's own reason (Message/Details in the error body) so the user knows why it failed.
        catchError((err) =>
          of({
            message:
              err?.error?.Details || err?.error?.details || err?.error?.Message || err?.error?.message ||
              'Unable to create the project. Nothing was changed - please try again.',
            newProjectID: '',
          })
        )
      );
  }

  closeBidAsLost(request: CloseBidAsLostRequest): Observable<string> {
    return this.http
      .post<SimpleResponse>(`${this.base}${BidsEndpoints.CloseBidAsLostUrl}`, request)
      .pipe(
        map((res) => res?.message ?? 'Success'),
        catchError(() => of('Error'))
      );
  }

  // Blazor passed the signed-in user as createdBy (see the note at the top). Callers pass '' for now.
  // getNextDisplayBidId(createdBy: string): Observable<string | null> {
  //   console.log('Fetching next display bid ID for createdBy:', createdBy); // Debugging line to check the createdBy value
  //   return this.http
  //     .get<NextDisplayBidIdResponse>(`${this.base}${BidsEndpoints.GetNextDisplayBidIDUrl}/${createdBy}`)
  //     .pipe(
  //       map((res) => res?.displayBidId ?? null),
  //       catchError(() => of(null))
  //     );
  // }
getNextDisplayBidId(createdBy: string): Observable<string | null> {
  console.log('Fetching next display bid ID for createdBy:', createdBy);

  return this.http
    .get<NextDisplayBidIdResponse>(
      `${this.base}${BidsEndpoints.GetNextDisplayBidIDUrl}/${createdBy}`
    )
    .pipe(
      tap(res => {
        console.log('API response:', res);
        console.log('Display Bid ID:', res?.displayBidID);
      }),
      map(res => res?.displayBidID ?? null),
      tap(displayBidID => {
        console.log('Mapped displayBidID:', displayBidID);
      }),
      catchError(error => {
        console.error('Error getting next display bid ID:', error);
        return of(null);
      })
    );
}
  getBidAccessEmployees(): Observable<Employee[]> {
    return this.http
      .get<Employee[]>(`${this.base}${BidsEndpoints.GetBidAccessEmployeesUrl}`)
      .pipe(catchError(() => of([])));
  }

  getContractorClientByName(clientName: string): Observable<ContractorClient | null> {
    return this.http
      .get<ContractorClient>(`${this.base}${BidsEndpoints.GetContractorClientByNameUrl}/${clientName}`)
      .pipe(catchError(() => of(null)));
  }

  // An Estimation route (see BidsEndpoints.GetAllContractorClientsUrl).
  getAllContractorClients(): Observable<ContractorClient[]> {
    return this.http
      .get<{ data: ContractorClient[] }>(`${this.base}${BidsEndpoints.GetAllContractorClientsUrl}`)
      .pipe(
        map((response) => response?.data ?? []),
        catchError(() => of([]))
      );
  }
}
