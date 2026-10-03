import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstimationBidEndpoints } from '../accounting-endpoints';
import {
  BidAmount,
  BidEmployee,
  BidInfoDto,
  BidPhase,
  ContractorClient,
  SubmitToSageResponse,
} from '../models/accounting/bid-info.model';

/**
 * Read this before relying on it: Accounting's Add Form gets almost everything from the Estimation
 * service in Blazor, not Accounting. That covers loading the bid, the contractor dropdown and
 * address fill, the user's name, and the Bid Amounts, Bid Phases and Bid Employees grids. Only
 * SubmitToSage is Accounting's own.
 *
 * Most routes here are guessed from IEstimationService's method names. Only GetBidDetails and
 * GetEmployees are confirmed in GlobalEndpoints.cs.
 *
 * Once the Estimation module's Angular service covers this, point AddFormComponent at it and
 * delete this file, so there's only one source for bid data.
 */
@Injectable({ providedIn: 'root' })
export class AccountingBidInfoService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getBidDetails(jobId: number): Observable<BidInfoDto | null> {
    return this.http
      .get<BidInfoDto>(`${this.base}${EstimationBidEndpoints.GetBidDetailsUrl}/${jobId}`)
      .pipe(catchError(() => of(null)));
  }

  getAllContractorClients(): Observable<ContractorClient[]> {
    return this.http
      .get<ContractorClient[]>(`${this.base}${EstimationBidEndpoints.GetAllContractorClientsUrl}`)
      .pipe(catchError(() => of([])));
  }

  // The Add Employee dropdown uses GetAllEmployees(), which returns the same ContractorClient shape
  // as GetAllContractorClients(). Probably a copy-paste in the C# code, not a different list.
  // Confirm with the product owner.
  getAllEmployees(): Observable<ContractorClient[]> {
    return this.http
      .get<ContractorClient[]>(`${this.base}${EstimationBidEndpoints.GetAllEmployeesUrl}`)
      .pipe(catchError(() => of([])));
  }

  getContractorClientById(clientId: string): Observable<ContractorClient | null> {
    return this.http
      .get<ContractorClient>(`${this.base}${EstimationBidEndpoints.GetContractorClientByIdUrl}/${clientId}`)
      .pipe(catchError(() => of(null)));
  }

  getBidEmployees(jobId: string): Observable<BidEmployee[]> {
    return this.http
      .get<BidEmployee[]>(`${this.base}${EstimationBidEndpoints.GetBidEmployeesUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  getBidsAmount(jobId: string): Observable<BidAmount[]> {
    return this.http
      .get<BidAmount[]>(`${this.base}${EstimationBidEndpoints.GetBidsAmountUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  getPhases(jobId: string): Observable<BidPhase[]> {
    return this.http
      .get<BidPhase[]>(`${this.base}${EstimationBidEndpoints.GetPhasesUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  insertBid(bidAmount: BidAmount): Observable<SubmitToSageResponse | null> {
    return this.http
      .post<SubmitToSageResponse>(`${this.base}${EstimationBidEndpoints.InsertBidUrl}`, bidAmount)
      .pipe(catchError(() => of(null)));
  }

  insertPhase(bidPhase: BidPhase): Observable<boolean> {
    return this.http
      .post<boolean>(`${this.base}${EstimationBidEndpoints.InsertPhaseUrl}`, bidPhase)
      .pipe(catchError(() => of(false)));
  }

  insertEmployee(bidEmployee: BidEmployee): Observable<boolean> {
    return this.http
      .post<boolean>(`${this.base}${EstimationBidEndpoints.InsertEmployeeUrl}`, bidEmployee)
      .pipe(catchError(() => of(false)));
  }

deleteBidAmount(id: string): Observable<boolean> {
  return this.http.post<boolean>(
    `${this.base}${EstimationBidEndpoints.DeleteBidAmountUrl}`,
    JSON.stringify(id),
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  ).pipe(
    catchError((err) => {
      console.error('DeleteBidAmount API error:', err);
      return of(false);
    })
  );
}
  deletePhase(id: string): Observable<boolean> {
    return this.http
      .post<boolean>(`${this.base}${EstimationBidEndpoints.DeletePhaseUrl}`,
        JSON.stringify(id),
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
        )
      .pipe(catchError(() => of(false)));
  }

  deleteEmployee(id: string): Observable<boolean> {
    return this.http
      .post<boolean>(`${this.base}${EstimationBidEndpoints.DeleteEmployeeUrl}`, 
          JSON.stringify(id),
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
      )
      .pipe(catchError(() => of(false)));
  }

  updateBid(bid: BidInfoDto): Observable<SubmitToSageResponse | null> {
    return this.http
      .post<SubmitToSageResponse>(`${this.base}${EstimationBidEndpoints.UpdateBidUrl}`, bid)
      .pipe(catchError(() => of(null)));
  }
}
