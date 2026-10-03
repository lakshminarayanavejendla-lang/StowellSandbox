import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, catchError, delay, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectManagementEndpoints } from '../project-management-endpoints';
import { CashFlowForecastResponse } from '../models/project-management/cash-flow-query.model';
import { sampleMonthlyReport } from './monthly-financials-sample';

/**
 * Ported from ReportingServices.cs. It has a single method, the Cash Flow Forecast
 * (reporting-dashboard/cash-flow-forecast); see cash-flow-query.model.ts for the response shape.
 *
 * The other report pages use ProjectCostCodeService and JobSummaryService directly, and their
 * routes are already in project-management-endpoints.ts.
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

  /** The Monthly Financials workbook ("<year> - <Month> Financials ALL") for one period, as an .xlsx blob.
   * Errors go to the caller so the page can say the report failed. */
  downloadMonthlyFinancials(year: number, month: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}api/Reports/MonthlyFinancials`, {
      params: { year, month },
      observe: 'response',
      responseType: 'blob',
    });
  }

  /** One report from the Monthly Financials package (for example 'ar-aging'), as data for the page.
   * refresh re-pulls it from Sage instead of using the copy the API keeps for 10 minutes. */
  /** True while Monthly Financials shows built-in sample figures instead of calling the API (see environment.ts). */
  readonly sampleMode = environment.monthlyFinancialsSample === true;

  getMonthlyReport(key: string, year: number, month: number, refresh = false): Observable<MonthlyReport> {
    if (this.sampleMode) {
      // a short wait, so the loading state shows as it will with the real API
      return of(sampleMonthlyReport(key, year, month)).pipe(delay(350));
    }
    return this.http.get<MonthlyReport>(`${this.base}api/Reports/MonthlyFinancials/Report`, { params: { key, year, month, refresh } });
  }

  /** The same report as its own Excel workbook. */
  downloadMonthlyReport(key: string, year: number, month: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}api/Reports/MonthlyFinancials/Report/Excel`, {
      params: { key, year, month },
      observe: 'response',
      responseType: 'blob',
    });
  }
}

/** One report from the Monthly Financials package: its sections, each a small table. */
export interface MonthlyReport {
  key: string;
  title: string;
  year: number;
  month: number;
  asOf: string;
  /** False when the report isn't in the package yet (Backlog). */
  available: boolean;
  sections: { title: string; columns: string[]; rows: (string | number | null)[][] }[];
}
