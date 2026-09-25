// Development environment. Mirrors appsettings.Development.json / appsettings.json values from
// the Blazor app. NOTE: only PUBLIC values belong here (client IDs, tenant IDs, base URLs).
// Never place a client secret in a browser-delivered app - the AzureAd:ClientSecret from the
// Blazor appsettings.json is NOT used here and never should be (public/SPA clients don't have
// secrets - only the confidential Web-platform Blazor app needs one).
//
// Per your instruction to reuse the same app registration: ClientId/TenantId below are the real
// values from appsettings.json's AzureAd section. You do NOT need a whole separate app
// registration for this to work - in the Azure Portal, open this same App Registration
// (ClientId 87fa7e85-fbd2-4d87-9358-eb64b7277f92) -> Authentication -> "Add a platform" ->
// "Single-page application", and register http://localhost:4200 (and your real prod origin) as
// SPA redirect URIs there. That's an additive platform configuration alongside the existing Web
// platform the Blazor app uses - the two can coexist on one registration. If MSAL Angular ever
// throws AADSTS9002326 ("cross-origin token redemption"), that specifically means the redirect
// URI got added under "Web" instead of "Single-page application" - re-add it under the right
// platform type.
export const environment = {
  production: false,
  // apiBaseUrl: 'https://stowellapi.proserv360.tech/',
  apiBaseUrl: 'https://localhost:7001/',
  // apiBaseUrl: 'https://phoenixsandboxapi.proserv360.tech/',
  eventsEmail: 'hr@stowellinc.com',
  azureAd: {
    instance: 'https://login.microsoftonline.com/',
    tenantId: '8797197d-bd16-4c5d-a882-ef538675a233',
    clientId: '0e419b11-0ecb-4266-a183-5818080dd12c',
    // redirectUri/postLogoutRedirectUri are set to window.location.origin so that the app can
    // run on localhost (dev) or the real prod origin without needing to change these values.
    // tenantId: '1c34d872-1291-4276-8794-6a5a4f0baf15',
    // clientId: '87fa7e85-fbd2-4d87-9358-eb64b7277f92',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  apiScopes: ['api://0e419b11-0ecb-4266-a183-5818080dd12c/access_as_user'],
};
