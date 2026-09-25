import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstimationEndpoints } from '../estimation-endpoints';
import { BidItem } from '../models/estimation/bid-item.model';
import { BidInfoDto } from '../models/estimation/bid-info.model';
import { BidAmount, BidEmployee, BidPhase } from '../models/estimation/bid-line-items.model';
import { ContractorClient } from '../models/estimation/contractor-client.model';
import { Phase } from '../models/estimation/phase.model';
import { EmployeeDetails, SubmitToSageResponse } from '../models/estimation/estimation-common.model';
import { CostCodeService } from './cost-code.service';

/**
 * Port of IEstimationService/EstimationService.cs (Services/EstimationService.cs), backing
 * BidQueue, AddBid and EditBidForm. Same auth caveat as JobService: the Blazor version
 * resolved the caller's email server-side (GetUserEmail() off the ClaimsPrincipal) for
 * GetLoggedUserEmail(); there is no HTTP call behind that method in the C# source at all, so
 * it is NOT ported here as a request - callers should resolve the signed-in user's email from
 * the MSAL account instead (see BidFormComponent's TODO, same placeholder pattern as
 * JobService/CurrentJobsComponent until real auth wiring lands).
 *
 * GetAllPhases() is technically ICostCodeService/CostCodeService.cs, not IEstimationService,
 * but AddBid/EditBidForm need it (the "Additional Phases" popup's dropdown data), so it's
 * included here rather than left unported - flagged in estimation-endpoints.ts too.
 */
@Injectable({ providedIn: 'root' })
export class EstimationService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  private costCodeService = inject(CostCodeService);

  getOpenBids(): Observable<BidItem[]> {
    return this.http
      .get<BidItem[]>(`${this.base}${EstimationEndpoints.GetOpenBidsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getClosedBids(): Observable<BidItem[]> {
    return this.http
      .get<BidItem[]>(`${this.base}${EstimationEndpoints.GetClosedBidsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getPendingBids(): Observable<BidItem[]> {
    return this.http
      .get<BidItem[]>(`${this.base}${EstimationEndpoints.GetPendingBidsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getBidDetails(jobId: number): Observable<BidInfoDto | null> {
    return this.http
      .get<BidInfoDto>(`${this.base}${EstimationEndpoints.GetBidDetailsUrl}/${jobId}`)
      .pipe(catchError(() => of(null)));
  }

  // See class-level note: ported for interface parity, not currently called by
  // AddBid/EditBidForm.
  getEmployees(jobId: number): Observable<EmployeeDetails[]> {
    return this.http
      .get<EmployeeDetails[]>(`${this.base}${EstimationEndpoints.GetEmployeesUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  getBidEmployees(jobId: string): Observable<BidEmployee[]> {
    return this.http
      .get<BidEmployee[]>(`${this.base}${EstimationEndpoints.GetBidEmployeesUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  // NOTE: despite the name, this returns ContractorClient[] (the C# source calls it for the
  // Project Resources "Employee" dropdown's data source, same shape as the Client dropdown -
  // see ContractorClient model note). Ported as-is.
  getAllEmployees(): Observable<ContractorClient[]> {
    return this.http
      .get<ContractorClient[]>(`${this.base}${EstimationEndpoints.GetAllEmployeesUrl}`)
      .pipe(catchError(() => of([])));
  }

  getAllContractorClients(): Observable<ContractorClient[]> {
    return this.http
      .get<{ data: ContractorClient[] }>(`${this.base}${EstimationEndpoints.GetAllContractorClientsUrl}`)
      .pipe(
        map((response) => response?.data ?? []),
        catchError(() => of([]))
      );
  }

  getContractorClientById(clientId: string): Observable<ContractorClient | null> {
    return this.http
      .get<ContractorClient>(`${this.base}${EstimationEndpoints.GetContractorClientByIdUrl}/${clientId}`)
      .pipe(catchError(() => of(null)));
  }

  // Delegates to CostCodeService.getAllPhases() (api/CostCode/GetAllPhases) rather than
  // duplicating the HTTP call here - see class-level note. recnum is optional on
  // CostCodeService's Phase model but required on this service's; defaulted to '' when absent
  // so the returned shape matches what this method has always returned.
  getAllPhases(): Observable<Phase[]> {
    return this.costCodeService.getAllPhases().pipe(
      map((phases) => phases.map((phase) => ({ ...phase, recnum: phase.recnum ?? '' })))
    );
  }

  getNewBidNumber(): Observable<string> {
    return this.http
      .get(`${this.base}${EstimationEndpoints.GetNewBidNumberUrl}`, { responseType: 'text' })
      .pipe(catchError(() => of('')));
  }

  getBidsAmount(jobId: string): Observable<BidAmount[]> {
    return this.http
      .get<BidAmount[]>(`${this.base}${EstimationEndpoints.GetBidsAmountUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  getPhases(jobId: string): Observable<BidPhase[]> {
    return this.http
      .get<BidPhase[]>(`${this.base}${EstimationEndpoints.GetPhasesUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  insertBid(bidAmount: BidAmount): Observable<SubmitToSageResponse | null> {
    return this.http
      .post<SubmitToSageResponse>(`${this.base}${EstimationEndpoints.InsertBidUrl}`, bidAmount)
      .pipe(catchError(() => of(null)));
  }

  insertPhase(bidPhase: BidPhase): Observable<boolean> {
    return this.http
      .post(`${this.base}${EstimationEndpoints.InsertPhaseUrl}`, bidPhase, { observe: 'response' })
      .pipe(
        map((response) => response.ok),
        catchError(() => of(false))
      );
  }

  insertEmployee(bidEmployee: BidEmployee): Observable<boolean> {
    return this.http
      .post(`${this.base}${EstimationEndpoints.InsertEmployeeUrl}`, bidEmployee, { observe: 'response' })
      .pipe(
        map((response) => response.ok),
        catchError(() => of(false))
      );
  }

  submitBid(bid: BidInfoDto): Observable<SubmitToSageResponse | null> {
    return this.http
      .post<SubmitToSageResponse>(`${this.base}${EstimationEndpoints.SubmitBidUrl}`, bid)
      .pipe(catchError(() => of(null)));
  }

  updateBid(bid: BidInfoDto): Observable<SubmitToSageResponse | null> {
    return this.http
      .post<SubmitToSageResponse>(`${this.base}${EstimationEndpoints.UpdateBidUrl}`, bid)
      .pipe(catchError(() => of(null)));
  }

  deleteBidAmount(id: string): Observable<boolean> {
    return this.http
      .post(`${this.base}${EstimationEndpoints.DeleteBidAmountUrl}`, JSON.stringify(id), {
        observe: 'response',
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        map((response) => response.ok),
        catchError(() => of(false))
      );
  }

  deletePhase(id: string): Observable<boolean> {
    return this.http
      .post(`${this.base}${EstimationEndpoints.DeletePhaseUrl}`, JSON.stringify(id), {
        observe: 'response',
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        map((response) => response.ok),
        catchError(() => of(false))
      );
  }

  deleteEmployee(id: string): Observable<boolean> {
    return this.http
      .post(`${this.base}${EstimationEndpoints.DeleteEmployeeUrl}`, JSON.stringify(id), {
        observe: 'response',
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        map((response) => response.ok),
        catchError(() => of(false))
      );
  }
}
