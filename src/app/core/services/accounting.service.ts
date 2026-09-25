import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountingEndpoints } from '../accounting-endpoints';
import { AccountingItem } from '../models/accounting/accounting-item.model';
import { ApiResponse, BudgetRecord, Phase } from '../models/accounting/budget.model';
import { CostCodeList } from '../models/accounting/cost-code.model';
import { BidInfoDto, SubmitToSageResponse } from '../models/accounting/bid-info.model';
import { AuthService } from './auth.service';

/**
 * Port of IAccountingService/AccountingService.cs. As in JobService (Phase 1), the Blazor
 * version resolved the caller's email server-side (GetUserEmail() off the ClaimsPrincipal) for
 * GetRecords/BudgetApproveRequest/BudgetRejectRequest; here that has to come from the signed-in
 * MSAL account. TODO wire up a real user-email source once auth is fully in place (see
 * JobService's identical TODO from Phase 1) - the placeholder below mirrors that pattern.
 *
 * GetApproveBudgetData/GetModifyBudgetData/BudgetApproveRequestAsync/BudgetRejectRequest are
 * intentionally identical-shaped pairs - see budget-approval.component.ts, which drives both
 * the "new" and "modify" flows through a single component parameterized by mode, mirroring the
 * near-duplicate ApproveNewBudgetBase.cs / ApproveModifyBudgetBase.cs in the original.
 */
@Injectable({ providedIn: 'root' })
export class AccountingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private base = environment.apiBaseUrl;

  // TODO: replace with the real signed-in user's email/UPN from the MSAL account once auth is
  // fully wired - see JobService's identical placeholder from Phase 1.
  private placeholderEmail = this.authService.getLoggedInUserEmail() ?? '';

  getRecords(email: string = this.placeholderEmail): Observable<AccountingItem[]> {
    return this.http
      .get<AccountingItem[]>(`${this.base}${AccountingEndpoints.GetRecordsUrl}/${email}`)
      .pipe(catchError(() => of([])));
  }

  getCostCodes(filter: string): Observable<CostCodeList[]> {
    return this.http
      .get<CostCodeList[]>(`${this.base}${AccountingEndpoints.GetCostCodesUrl}/${encodeURIComponent(filter)}`)
      .pipe(catchError(() => of([])));
  }

  getApproveBudgetData(phase: Phase): Observable<BudgetRecord[]> {
    return this.http
      .post<BudgetRecord[]>(`${this.base}${AccountingEndpoints.GetApproveBudgetDataUrl}`, phase)
      .pipe(catchError(() => of([])));
  }

  getModifyBudgetData(phase: Phase): Observable<BudgetRecord[]> {
    return this.http
      .post<BudgetRecord[]>(`${this.base}${AccountingEndpoints.GetModifyBudgetDataUrl}`, phase)
      .pipe(catchError(() => of([])));
  }

  budgetApproveRequest(phase: Phase): Observable<ApiResponse> {
    const payload: Phase = { ...phase, email: this.placeholderEmail };
    return this.http
      .post<ApiResponse>(`${this.base}${AccountingEndpoints.BudgetApproveRequestUrl}`, payload)
      .pipe(
        catchError(() => of<ApiResponse>({ success: false, message: 'Unable to reach server.' }))
      );
  }

  budgetRejectRequest(phase: Phase): Observable<ApiResponse> {
    const payload: Phase = { ...phase, email: this.placeholderEmail };
    return this.http
      .post<ApiResponse>(`${this.base}${AccountingEndpoints.BudgetRejectRequestUrl}`, payload)
      .pipe(
        catchError(() => of<ApiResponse>({ success: false, message: 'Unable to reach server.' }))
      );
  }

  submitToSage(bid: BidInfoDto): Observable<SubmitToSageResponse> {
    return this.http.post<SubmitToSageResponse>(`${this.base}${AccountingEndpoints.SubmitToSageUrl}`, bid).pipe(
      catchError((err) =>
        of<SubmitToSageResponse>({ success: false, message: `Exception: ${err?.message ?? err}`, isExist: false })
      )
    );
  }


}
