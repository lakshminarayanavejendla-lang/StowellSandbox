import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { CashFlowForecastResponse } from '../models/project-management/cash-flow-query.model';

/**
 * Port of Services/IReportingService.cs + ReportingServices.cs - now claimed by the Reporting
 * Dashboard phase (Phase 3), per the FLAG the Project Management phase left here. Kept in this
 * file/location rather than moved, since it's still the only Angular consumer-facing service for
 * IReportingService and other Phase 2 code may already import from this path.
 *
 * CashFlowForecastResponse's real shape is now confirmed (see
 * core/models/project-management/cash-flow-query.model.ts's updated header comment for the C#
 * source and reasoning) - it lives in Models/CostCodeList.cs, found via
 * Components/Pages/ReportingDashboard/CashFlowForecastBase.razor.cs, which is this method's only
 * real caller (backs the "Cash Flow Forecast" report at reporting-dashboard/cash-flow-forecast).
 *
 * IMPORTANT: IReportingService.cs itself only declares this one method - there is no other
 * IReportingService surface to port. Every other Reporting Dashboard report page (AR Invoice
 * List, Cost Code Summary Report, Cash Flow To Date - Multiple, Contract Summary, Invoice
 * Receivable, Job Summary Report, Prime Change List) actually calls ICostCodeService or
 * IJobSummaryService instead, both of which Project Management already ported in full as
 * ProjectCostCodeService (core/services/project-cost-code.service.ts) and JobSummaryService
 * (core/services/job-summary.service.ts) - the Reporting Dashboard page components import and
 * reuse those directly rather than duplicating their methods here. No new
 * core/reporting-dashboard-endpoints.ts file was needed either, for the same reason: every route
 * those report pages call was already confirmed and centralized in
 * core/project-management-endpoints.ts by the Project Management phase.
 */
@Injectable({ providedIn: 'root' })
export class ReportingService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getCashFlowForecastReportData(): Observable<CashFlowForecastResponse | undefined> {
  return this.http
    .get<CashFlowForecastResponse>(
      `${this.base}${ProjectManagementEndpoints.GetCashFlowForecastReportDataUrl}`
    )
    .pipe(
      catchError(() => of(undefined))
    );
}
}
