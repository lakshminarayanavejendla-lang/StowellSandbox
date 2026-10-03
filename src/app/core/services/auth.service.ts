import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private msalService = inject(MsalService);
  private http = inject(HttpClient);

  getLoggedInUserEmail(): string | null {
    const account = this.getAccount();
    return account?.username ?? null;
  }

  getLoggedInUserName(): string | null {
    const account = this.getAccount();
    return account?.name ?? null;
  }

  getLoggedInUserRole(): string | null {
    const account = this.getAccount();

    if (!account) {
      return null;
    }

    const roles = account.idTokenClaims?.['roles'] as string[] | undefined;

    return roles?.[0] ?? null;
  }

getProfilePhoto(): Observable<Blob | null> {
  return this.http
    .get('https://graph.microsoft.com/v1.0/me/photo/$value', {
      responseType: 'blob'
    })
    .pipe(
      catchError((error) => {
        console.error('Profile photo error:', error);
        return of(null);
      })
    );
}
  // A plain link to postLogoutRedirectUri didn't clear the MSAL session, so the app reloaded still
  // signed in. logoutRedirect() clears the local cache, ends the Azure AD session, then redirects.
  logout(): void {
    this.msalService.logoutRedirect({
      postLogoutRedirectUri: environment.azureAd.postLogoutRedirectUri,
    });
  }

  private getAccount() {
    const activeAccount =
      this.msalService.instance.getActiveAccount();

    if (activeAccount) {
      return activeAccount;
    }

    const accounts =
      this.msalService.instance.getAllAccounts();

    return accounts.length > 0 ? accounts[0] : null;
  }
}