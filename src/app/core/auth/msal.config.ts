import {
  IPublicClientApplication,
  PublicClientApplication,
  InteractionType,
  BrowserCacheLocation,
  LogLevel,
} from '@azure/msal-browser';
import {
  MsalGuardConfiguration,
  MsalInterceptorConfiguration,
} from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

/**
 * Phase 1 default: MSAL Angular (client-side / public-client Azure AD auth), replacing the
 * Blazor server's Microsoft.Identity.Web confidential-client OIDC flow. This is a placeholder
 * choice flagged for confirmation - see the handoff notes for the alternative (a BFF / auth
 * proxy pattern that keeps token handling server-side, closer to what the Blazor app did).
 */
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.azureAd.clientId,
      authority: `${environment.azureAd.instance}${environment.azureAd.tenantId}`,
      redirectUri: environment.azureAd.redirectUri,
      postLogoutRedirectUri: environment.azureAd.postLogoutRedirectUri,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level: LogLevel, message: string) => {
          if (!environment.production) {
            console.log(message);
          }
        },
        logLevel: LogLevel.Warning,
      },
    },
  });
}

// export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
//   const protectedResourceMap = new Map<string, Array<string>>();
//   // Any call to the StowellCoAPI base URL gets a bearer token attached automatically.
//   protectedResourceMap.set(environment.apiBaseUrl, environment.apiScopes);
//   return {
//     interactionType: InteractionType.Redirect,
//     protectedResourceMap,
//   };
// }
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();

  // Your API
  protectedResourceMap.set(
    environment.apiBaseUrl,
    environment.apiScopes
  );

  // Microsoft Graph
  protectedResourceMap.set(
    'https://graph.microsoft.com/v1.0/',
    ['User.Read']
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: ['user.read', ...environment.apiScopes],
    },
  };
}
