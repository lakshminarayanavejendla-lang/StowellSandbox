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
 * Ported from AccountingService.cs. Blazor got the user's email on the server for GetRecords and
 * the budget approve and reject calls. Here it has to come from the MSAL account.
 * TODO: use the real user's email once sign-in is fully wired (same as JobService).
 *
 * The new-budget and modify-budget methods come in matching pairs because one component,
 * budget-approval.component.ts, handles both modes. The original had two near-copies,
 * ApproveNewBudgetBase.cs and ApproveModifyBudgetBase.cs.
 */
@Injectable({ providedIn: 'root' })
export class AccountingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private base = environment.apiBaseUrl;

  // TODO: use the signed-in user's email from the MSAL account once sign-in is fully wired (same as JobService).
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
