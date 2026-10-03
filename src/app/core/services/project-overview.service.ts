import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of,tap,map,throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { CurrentCostSummaryViewModel, Job, Phase } from '../models/project-management/cost-summary.model';
import { BidInfoDto, BidPhase, EmployeeDetails, ContractorClient } from '../models/project-management/bid-info.model';

/**
 * Data for the Project Overview tabs (Overview, Details, Financials, Reporting). Ported from
 * ProjectOverviewService.cs.
 */
@Injectable({ providedIn: 'root' })
export class ProjectOverviewService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  // `phase` limits the summary to one phase. Leave it empty for all phases.
  getCurrentCostSummaryViewModel(recnum: string, phase = ''): Observable<CurrentCostSummaryViewModel> {
    return this.http
      .get<CurrentCostSummaryViewModel>(
        `${this.base}${ProjectManagementEndpoints.GetCurrentCostSummaryViewModelUrl}/${recnum}`,
        phase ? { params: { phase } } : {}
      )
      .pipe(catchError(() => of({ selectedJobId: recnum, selectedJobName: '' })));
  }

  getJobCodeDetails(recnum: string): Observable<Job> {
    return this.http
      .get<Job>(`${this.base}${ProjectManagementEndpoints.GetJobDetailsUrl}/${recnum}`)
      .pipe(catchError(() => of({ fullJob: '', jobName: '', recnum })));
  }

  /**
   * In the Blazor app these four calls belong to IEstimationService, not IProjectOverviewService.
   * They're here for the Project Overview tabs. Once the Estimation module's Angular service covers
   * them, delete these and use that service, so there aren't two copies of the same calls.
   */
  getBidDetails(projectId: number): Observable<BidInfoDto> {
    return this.http
      .get<BidInfoDto>(`${this.base}${ProjectManagementEndpoints.GetBidDetailsUrl}/${projectId}`)
      .pipe(catchError(() => of({ jobID: String(projectId), jobName: '' })));
  }

  getBidPhases(projectId: number): Observable<BidPhase[]> {
    // A guessed route (see project-management-endpoints.ts).
    return this.http
      .get<BidPhase[]>(`${this.base}${ProjectManagementEndpoints.GetEstimationPhasesUrl}/${projectId}`)
      .pipe(catchError(() => of([])));
  }

  getEmployees(projectId: number): Observable<EmployeeDetails[]> {
    return this.http
      .get<EmployeeDetails[]>(`${this.base}${ProjectManagementEndpoints.GetEmployeesUrl}/${projectId}`)
      .pipe(catchError(() => of([])));
  }

  // getAllContractorClients(): Observable<ContractorClient[]> {
  //   // Route INFERRED - see project-management-endpoints.ts header note.
  //   return this.http
  //     .get<ContractorClient[]>(`${this.base}${ProjectManagementEndpoints.GetAllContractorClientsUrl}`)
  //     .pipe(catchError(() => of([])));
  // }
//   getAllContractorClients(): Observable<ContractorClient[]> {

//   const url =
//     `${this.base}${ProjectManagementEndpoints.GetAllContractorClientsUrl}`;

//   console.log('GetAllContractorClients URL:', url);

//   return this.http
//     .get<ContractorClient[]>(url)
//     .pipe(
//       tap(response => {
//         console.log('GetAllContractorClients RAW response:', response);
//       }),
//       catchError(error => {
//         console.error('GetAllContractorClients ERROR:', error);
//         return of([]);
//       })
//     );
// }
getAllContractorClients(): Observable<ContractorClient[]> {

  const url =
    `${this.base}${ProjectManagementEndpoints.GetAllContractorClientsUrl}`;

  console.log('GetAllContractorClients URL:', url);

  return this.http
    .get<{ data: ContractorClient[] }>(url)
    .pipe(
      tap(response => {
        console.log('GetAllContractorClients RAW response:', response);
      }),
      map(response => response.data ?? []),
      catchError(error => {
        console.error('GetAllContractorClients ERROR:', error);
        return of([]);
      })
    );
}
deleteEmployee(item: EmployeeDetails): Observable<string> {

  const url =
    `${this.base}${ProjectManagementEndpoints.DeleteEmployeeUrl}/${item.id}`;

  console.log('DeleteEmployee URL:', url);

  return this.http
    .delete<string>(url)
    .pipe(
      tap(response => {
        console.log(
          'DeleteEmployee RAW response:',
          response
        );
      }),
      catchError(error => {
        console.error(
          'DeleteEmployee ERROR:',
          error
        );

        return throwError(() => error);
      })
    );
}
}
