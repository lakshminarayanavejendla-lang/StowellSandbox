import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of,tap,map,throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { CurrentCostSummaryViewModel, Job, Phase } from '../models/project-management/cost-summary.model';
import { BidInfoDto, BidPhase, EmployeeDetails, ContractorClient } from '../models/project-management/bid-info.model';

/**
 * Port of Services/IProjectOverviewService.cs + ProjectOverviewService.cs - backs the Project
 * Overview page's four tabs (Overview/Details/Financials/Reporting).
 */
@Injectable({ providedIn: 'root' })
export class ProjectOverviewService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  // `phase` (optional) filters the summary to one phase - the API already accepts it as a query
  // param (ProjectOverviewController.GetCurrentCostSummaryViewModel); empty = all phases.
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
   * These four calls belong, in the Blazor app, to IEstimationService (injected directly into
   * OverviewTabBase/ProjectDetailsTabBase alongside IProjectOverviewService) - NOT to
   * IProjectOverviewService itself. They're grouped here rather than duplicated because the
   * Project Overview tabs are this module's responsibility and the Estimation module is being
   * converted in parallel by another agent; once that phase ships its own Angular
   * EstimationService, these four methods should be deleted here and the tab components should
   * import that service instead, to avoid two divergent client implementations of the same API.
   */
  getBidDetails(projectId: number): Observable<BidInfoDto> {
    return this.http
      .get<BidInfoDto>(`${this.base}${ProjectManagementEndpoints.GetBidDetailsUrl}/${projectId}`)
      .pipe(catchError(() => of({ jobID: String(projectId), jobName: '' })));
  }

  getBidPhases(projectId: number): Observable<BidPhase[]> {
    // Route INFERRED - see project-management-endpoints.ts header note.
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
