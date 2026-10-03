import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { CostCodeRecord, BidItem, StatusModel } from '../models/project-management/cost-code.model';
import {
  Phase,
  CostCode,
  Job,
  CashFlowRecord,
  CurrentCostSummaryViewModel,
  ContractSummary,
  PrimeChangeList,
  InvoiceReceivable,
  InvoicePayment,
} from '../models/project-management/cost-summary.model';
import { CashFlowQueryInput } from '../models/project-management/cash-flow-query.model';

/**
 * The parts of CostCodeService.cs the Project Management pages use: the Project Queue, the job and
 * phase pickers on Create/Modify Budget, the Cash Flow Report, and the Cost Code Summary and Job
 * Summary reports.
 *
 * It's called ProjectCostCodeService because cost-code.service.ts already holds Accounting's smaller
 * port of the same C# class. Both cover only part of it; merge them into one service later.
 */
@Injectable({ providedIn: 'root' })
export class ProjectCostCodeService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getCostCodeRecords(): Observable<CostCodeRecord[]> {
    return this.http
      .get<CostCodeRecord[]>(`${this.base}${ProjectManagementEndpoints.GetCostCodeRecordsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getBids(): Observable<BidItem[]> {
    return this.http
      .get<BidItem[]>(`${this.base}${ProjectManagementEndpoints.GetBidsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getJobPhasesData(jobId: number): Observable<Phase[]> {
    return this.http
      .get<Phase[]>(`${this.base}${ProjectManagementEndpoints.GetJobPhasesDataUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  getAllStatusesData(): Observable<StatusModel[]> {
    return this.http
      .get<StatusModel[]>(`${this.base}${ProjectManagementEndpoints.GetAllStatusesDataUrl}`)
      .pipe(catchError(() => of([])));
  }

  getAllUserJobsByStatus(status: number): Observable<CostCodeRecord[]> {
    return this.http
      .get<CostCodeRecord[]>(`${this.base}${ProjectManagementEndpoints.GetAllUserJobsByStatusUrl}/${status}`)
      .pipe(catchError(() => of([])));
  }

  /**
   * The C# version adds the user's email to the URL on the server (GetAllUserJobsUrl/{email}).
   * TODO: once sign-in tokens reach the API, check whether it still needs the email in the path or
   * reads the user from the token.
   */
  getAllUserJobs(email = 'placeholder@phoenixcanopyshades.com'): Observable<CostCodeRecord[]> {
    return this.http
      .get<CostCodeRecord[]>(`${this.base}${ProjectManagementEndpoints.GetAllUserJobsUrl}/${email}`)
      .pipe(catchError(() => of([])));
  }

  cashFlowAllDataByPeriod(input: CashFlowQueryInput): Observable<CashFlowRecord[]> {
    return this.http
      .post<CashFlowRecord[]>(`${this.base}${ProjectManagementEndpoints.GetCashFlowAllDataByPeriodUrl}`, input)
      .pipe(catchError(() => of([])));
  }

  cashFlowAllDataByMultipleJobsAndPeriod(input: CashFlowQueryInput): Observable<CashFlowRecord[]> {
    return this.http
      .post<CashFlowRecord[]>(
        `${this.base}${ProjectManagementEndpoints.CashFlowAllDataByMulitpleJobsAndPeriodUrl}`,
        input
      )
      .pipe(catchError(() => of([])));
  }

  /** CostCodeService's "V1" version, used by the Cost Code Summary report. */
  getCurrentCostSummaryViewModel(
    recnum = '',
    costCode?: string[],
    phase = '',
    startDate = '',
    endDate = ''
  ): Observable<CurrentCostSummaryViewModel> {
    let query = `?recnum=${recnum}`;
    if (costCode?.length) query += `&costCode=${costCode.join(',')}`;
    if (phase) query += `&phase=${phase}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;

    return this.http
      .get<CurrentCostSummaryViewModel>(
        `${this.base}${ProjectManagementEndpoints.GetCurrentCostSummaryViewModel1Url}${query}`
      )
      .pipe(catchError(() => of({ selectedJobId: recnum, selectedJobName: '', costCodes: [], jobs: [], phases: [] })));
  }

  getContractSummaryData(jobNumber: string): Observable<ContractSummary[]> {
    return this.http
      .get<ContractSummary[]>(`${this.base}${ProjectManagementEndpoints.GetContractSummaryDataUrl}/${jobNumber}`)
      .pipe(catchError(() => of([])));
  }

  getPrimeChangeList(jobNumber: string): Observable<PrimeChangeList[]> {
    return this.http
      .get<PrimeChangeList[]>(`${this.base}${ProjectManagementEndpoints.GetPrimeChangeListUrl}/${jobNumber}`)
      .pipe(catchError(() => of([])));
  }

  getInvoiceReceivable(jobNumber: string): Observable<InvoiceReceivable[]> {
    return this.http
      .get<InvoiceReceivable[]>(`${this.base}${ProjectManagementEndpoints.GetInvoiceReceivableUrl}/${jobNumber}`)
      .pipe(catchError(() => of([])));
  }

  getARInvoice(jobNumber: string): Observable<InvoicePayment[]> {
    return this.http
      .get<InvoicePayment[]>(`${this.base}${ProjectManagementEndpoints.GetARInvoiceUrl}/${jobNumber}`)
      .pipe(catchError(() => of([])));
  }

  getCostCodesForReport(jobId: string): Observable<CostCode[]> {
    return this.http
      .get<CostCode[]>(`${this.base}${ProjectManagementEndpoints.GetCostCodesForReportUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  getJobCodesForReport(): Observable<Job[]> {
    return this.http
      .get<Job[]>(`${this.base}${ProjectManagementEndpoints.GetJobCodesForReportUrl}`)
      .pipe(catchError(() => of([])));
  }

  getPhasesForReport(jobId: string): Observable<Phase[]> {
    return this.http
      .get<Phase[]>(`${this.base}${ProjectManagementEndpoints.GetPhasesForReportUrl}/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  getAllPhases(): Observable<Phase[]> {
    return this.http
      .get<Phase[]>(`${this.base}${ProjectManagementEndpoints.GetAllPhasesUrl}`)
      .pipe(catchError(() => of([])));
  }

  getAllPeriodsData(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.base}${ProjectManagementEndpoints.GetAllPeriodsDataUrl}`)
      .pipe(catchError(() => of([])));
  }
}
