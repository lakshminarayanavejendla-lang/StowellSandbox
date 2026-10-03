import { bootstrapApplication } from '@angular/platform-browser';
import { registerLicense } from '@syncfusion/ej2-base';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Reusing the same Syncfusion license key already hardcoded in the Blazor app's Program.cs
// (Syncfusion.Licensing.SyncfusionLicenseProvider.RegisterLicense(...)), per your instruction to
// use the same credentials rather than mint new ones. Syncfusion license keys are issued per
// account (not per framework), so the same key that unlocks Syncfusion.Blazor should also unlock
// the ej2-angular-* packages here - but this hasn't been verified against your actual account
// dashboard. If Syncfusion components render with a licensing watermark/banner at runtime, log
// into your Syncfusion account -> "My Account" -> "Manage License Keys" and confirm this key
// covers the Angular platform (some legacy keys were framework-scoped); regenerate/copy the
// right one there if not, and swap it in here.
//
// Same secret-hygiene note as Program.cs's copy of this key: fine to keep in client-side code
// (Syncfusion's license check is a build/runtime watermark gate, not a security credential), but
// consider moving it to environment.ts alongside the other per-environment config rather than
// hardcoding it here, if you want a single place to change it later.
registerLicense(
  // Angular-platform key generated from Syncfusion's "Claim License Key" page for
  // Essential Studio Enterprise Edition v34.x.x - matches the ^34.2.2 ej2-angular-* packages
  // installed here, unlike the earlier commented-out keys which kept showing the trial banner.
  'Ngo9BigBOggjHTQxAR8/V1JAaF5cX2pCd1p/TH5YfUNzdUVEY1ZUTXxaS1ZhSXxVdkxiWH5YcHJURmNZVUR9XEY='
  // 'Ngo9BigBOggjHTQxAR8/V1JHaF1cXmhPYVFxWmFZfVhgdVRMZFpbRH9PMyBoS35RcEVmW3dfcXBTR2hdV0BxVEFe'
  // 'Ngo9BigBOggjGyl/VkJ+XU9Gf1RLVGpAY1J0WGBYb1xzflBPallYT3RfQFtjQX9bd0JhWn9adH1QRmtfVQ=='
  // 'Ngo9BigBOggjGyl/VkJ+XU9Gf1RLVGpAY1J0WGBYb1xzflBPallYT3RfQFtjQX9Ud0FhWHtXdnxUR2tfVQ=='
);

// Column Chooser (user-selectable columns) is offered on every grid by GridColumnsService, so its modules are made available globally.
// The grid library is large and the home page has no grid, so it is loaded in the background right after the app starts instead of
// being part of the first download; a grid page asks for the same code anyway, so it is ready by the time one renders.
import('@syncfusion/ej2-grids').then(({ Grid, Toolbar, ColumnChooser }) => Grid.Inject(Toolbar, ColumnChooser));

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
