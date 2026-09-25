import { MsalGuard } from '@azure/msal-angular';

// Re-exported so routes read naturally as `canActivate: [authGuard]`.
// MsalGuard redirects unauthenticated users into the Azure AD sign-in flow,
// mirroring the Blazor app's <AuthorizeRouteView>/<NotAuthorized><RedirectToLogin> behavior.
export const authGuard = MsalGuard;
