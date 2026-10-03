// Development settings, taken from the Blazor app's appsettings files. Only public values go here
// (client ids, tenant ids, URLs). Never put a client secret in a browser app: the AzureAd
// ClientSecret from the Blazor appsettings.json isn't used here and never should be. Only the
// server-side Blazor app needs one.
//
// ClientId and TenantId below come from the AzureAd section of appsettings.json, reusing the same
// app registration as asked. No new registration is needed. In the Azure Portal, open that App
// Registration (ClientId 87fa7e85-fbd2-4d87-9358-eb64b7277f92), go to Authentication, "Add a
// platform", choose "Single-page application", and add http://localhost:4200 and the production
// address as redirect URIs. That sits alongside the Blazor app's existing Web platform. If MSAL
// shows AADSTS9002326 ("cross-origin token redemption"), the redirect URI was added under "Web"
// instead of "Single-page application"; add it again under the right one.
export const environment = {
  production: false,
  // apiBaseUrl: 'https://stowellapi.proserv360.tech/',
  apiBaseUrl: 'https://localhost:7001/',
  // apiBaseUrl: 'https://phoenixsandboxapi.proserv360.tech/',
  // true: the Monthly Financials pages show built-in sample figures (core/services/monthly-financials-sample.ts) instead of
  // calling the API. Turn it off once the real data is ready.
  monthlyFinancialsSample: false,
  eventsEmail: 'hr@stowellinc.com',
  azureAd: {
    instance: 'https://login.microsoftonline.com/',
    tenantId: '8797197d-bd16-4c5d-a882-ef538675a233',
    clientId: '0e419b11-0ecb-4266-a183-5818080dd12c',
    // redirectUri and postLogoutRedirectUri use window.location.origin, so the app works on localhost
    // or the production address without changing them.
    // tenantId: '1c34d872-1291-4276-8794-6a5a4f0baf15',
    // clientId: '87fa7e85-fbd2-4d87-9358-eb64b7277f92',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  apiScopes: ['api://0e419b11-0ecb-4266-a183-5818080dd12c/access_as_user'],
};
