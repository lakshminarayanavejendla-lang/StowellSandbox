export const environment = {
  production: true,
  apiBaseUrl: 'https://stowellapi.proserv360.tech/',
  // Real data only in production (see environment.ts).
  monthlyFinancialsSample: false,
  eventsEmail: 'hr@stowellinc.com',
  azureAd: {
    instance: 'https://login.microsoftonline.com/',
        tenantId: '8797197d-bd16-4c5d-a882-ef538675a233',
    clientId: '0e419b11-0ecb-4266-a183-5818080dd12c',
    // tenantId: '1c34d872-1291-4276-8794-6a5a4f0baf15',
    // The same app registration as environment.ts; see that file for the "Add a platform" step in Azure.
    // clientId: '87fa7e85-fbd2-4d87-9358-eb64b7277f92',
    redirectUri: 'https://stowellsandbox.proserv360.tech/StowellAngularApp/',
    postLogoutRedirectUri: 'https://stowellsandbox.proserv360.tech/StowellAngularApp/logged-out',
  },
  apiScopes: ['api://0e419b11-0ecb-4266-a183-5818080dd12c/access_as_user'],
};
