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
 * FLAGGED CROSS-MODULE DEPENDENCY - read this before extending or trusting this file.
 *
 * AddFormBase.cs (the code-behind for Accounting's AddForm.razor) injects IEstimationService,
 * not IAccountingService, for almost everything except the final SubmitToSage call: loading
 * the original bid (GetBidDetails), the contractor-client dropdown + address autofill
 * (GetAllContractorClients/GetContractorClientById), the logged-in user's display name, and
 * full CRUD on the three AddForm sub-grids (Bid Amounts, Bid Phases, Bid Employees). All of
 * that is Estimation-module domain, being converted in parallel by another agent.
 *
 * This service exists only so AddFormComponent compiles and is demonstrably wired to
 * *something* real-shaped, without editing any file the Estimation agent might also be
 * touching. Its endpoint paths (accounting-endpoints.ts's EstimationBidEndpoints) are mostly
 * INFERRED from IEstimationService's C# method names, not read from EstimationService.cs's
 * actual implementation (out of scope for this phase) - only GetBidDetails/GetEmployees are
 * confirmed via Common/GlobalEndpoints.cs.
 *
 * Once the Estimation module's own Angular service exists, AddFormComponent should almost
 * certainly be pointed at that instead of this file, and this file should be deleted rather
 * than kept as a second source of truth for the same bid data.
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

  // AddFormBase.cs's `_contractClientRecords` (the "Add Employee" dropdown data source) comes
  // from IEstimationService.GetAllEmployees(), a *second*, differently-named method returning
  // the same ContractorClient shape as GetAllContractorClients() above - almost certainly a
  // copy/paste divergence in the C# source rather than an intentionally distinct data set.
  // Flag for the Estimation agent / product owner to confirm before assuming these are
  // actually different lists.
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
  debugger;
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
