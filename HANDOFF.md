# StowellCoApp: Blazor to Angular

The conversion was done in phases, as you asked ("shell + dashboard, phases by phases"):

- Phase 1: the shell and the Dashboard.
- Phase 2: Project Management, Bids, Estimation and Accounting.
- Phase 3: Contacts, Document Management, Reporting Dashboard and Phoenix Admin. After this every
  module in `NavMenu.razor` had a real route.
- Phase 4: the free stand-in components were replaced with Syncfusion Angular components.

The phase notes below describe what was true when each phase was done. Later work changed some of
it; the "Since then" notes say where.

## Security findings (not part of the conversion; please act on these)

1. **`appsettings.json` has secrets in plain text**: a real Azure AD `ClientSecret` (the same value
   also appears under `SharePoint` and `MicrosoftGraph`) and a SQL Server connection string. The
   file has been through this conversation, so treat the secret as exposed. Rotate it in the Azure
   AD app registration and keep the new one out of source control (user secrets, Key Vault or
   environment variables).
2. **The Syncfusion license key is hard-coded** in `Program.cs`. It's a license key, not a login
   credential, so it matters less, but it belongs in config.
3. **CORS allows any origin, method and header** (`AllowAllOrigins` in `Program.cs`). That's fine
   on localhost, but limit it to the Angular app's address before anything else uses the API.

None of this blocks the Angular work. Rotating a leaked secret is the urgent one.

## Phase 1: shell and Dashboard

- **Shell**: the left sidebar (logo and menu), the top bar (search, Quick Shortcut, Copilot,
  Document Management, Password Management, Support, Logout, right menu toggle), the right icon
  bar of external apps, and the footer. Routes cover every link in `NavMenu.razor`.
- **Dashboard**: the Current Jobs list (search and paging), a calendar widget and the four charts
  (Cash Collected vs Cash Paid, Retain Amount, Net Cash Out, Total Retain Hi/Low).
- **Sign-in**: MSAL Angular (`core/auth/msal.config.ts`), an `authGuard` on the layout route, and
  an interceptor that adds the sign-in token to API calls.

### Decisions that need your sign-off

**Component library.** To avoid licence costs you hadn't confirmed, Phase 1 used free parts:
Chart.js (`ng2-charts`) for charts, a plain HTML table for Current Jobs, and a simple agenda list
for the calendar. Each sat behind its own component so it could be swapped later. (Phase 4 swapped
them for Syncfusion. Since then, the dashboard's job list and calendar are custom components again.)

**Sign-in uses MSAL Angular in the browser, not a server-side proxy.** Tokens live in the browser,
which is a different trust model from the Blazor Server app, where the token never left the server.
If tokens must stay off the browser, the other option is a small backend-for-frontend proxy. The
app needs a "Single-page application" platform on its Azure AD registration (see "Running this
locally"); a SPA can't use a client secret.

### Things to double-check

- **`CurrentJob`, `ChartData` and `ChartDataset` had no single definition.** `IJobService.cs` and
  the charts use them through `StowellCoApp.DTO`, but neither the `DTO` nor the `Models` folder
  defines them. The only copies were inside `ColumnChart1.razor`, `LineChart1.razor` and
  `CalendarPage.razor` (`MyEventViewModel`). The Angular models (`src/app/core/models/*.ts`) follow
  those copies and how the fields are used, so check them against what the API returns.
- **Blazor files that looked unused and weren't ported:**
  - `TopBar.razor`: `MainLayout.razor` has its own top bar instead.
  - `Components/Layout/QuickShortcut.razor`: a third copy of the Quick Shortcut menu. All three are
    now one `<app-quick-shortcut>` component.
  - `ColumnChart1.razor` and `LineChart1.razor`: older versions of `ColumnChart.razor` and
    `LineChart.razor`. `Dashboard.razor` only uses the newer ones.

  Tell me if any of these is actually in use.
- **The Logout button in `MainLayout.razor` goes to `https://phoenixdesigns.proserv360.tech/`**,
  not the app's own `/authentication/logout`. It was ported as it was, but it looks like a
  leftover. (Since then, Logout calls MSAL's `logoutRedirect()` so it really signs you out.)

## Phase 2: Project Management, Bids, Estimation, Accounting

All four were built from the real Blazor pages, not the Phase 1 placeholders, so they have more
routes than Phase 1 guessed.

### What was built

- **Project Management** (`pages/project-management/`): Project Queue, Project Overview with its
  tabs on one page, Project Budget Configuration, Create Budget, New PO Form, and three reports
  (Cash Flow Report, Cost Code Summary, Job Summary), each by `:projectId`.
- **Bids** (`pages/bids/`): Current Bids, Bid Queue, New Bid, and Bid Overview with Summary and
  Details tabs and a document manager for each bid, plus a documents-only route.
- **Estimation** (`pages/estimation/`): Bid Queue (Open, Closed, Pending) and one `BidFormComponent`
  for Add Bid and Edit Bid, because the two Blazor pages were almost identical. (Since then,
  `estimation/edit-bid/:jobId` opens a separate Edit Project page; `BidFormComponent` still handles
  New Bid.)
- **Accounting** (`pages/accounting/`): Accounting Queue, PO Queue, Add Form (turning a bid into a
  project) and Budget Approval, shared by new and modify budgets for the same reason.

### Routes Phase 1 didn't know about

These come from links inside grids, tabs, edit forms and reports, not from the menu:
`bids/bid-overview/:bidId/:type`, `bids/documents/:bidId`, `estimation/edit-bid/:jobId`, the three
project reports, `project-budget-configuration/:action/:projectId`, and Accounting's
`add-form/:jobId`, `approve-new-budget/:projectId` and `approve-modify-budget/:projectId`. Each
module's `<module>.routes.ts` has the full list.

### Duplicate or unused Blazor code (built once, or skipped)

- **`AddBid.razor` and `EditBidForm.razor`**: nearly identical, so one `BidFormComponent`. Edit also
  loads the bid from `GetBidDetails` and shows Send For Approval.
- **`ApproveNewBudget.razor` and `ApproveModifyBudget.razor`**: identical markup, and the modify
  page still calls methods named `ApproveNewBudget()` and `RejectNewBudget()`. One
  `BudgetApprovalComponent` with `mode: 'new' | 'modify'`.
- **`BidFileManagerComponent.razor` and `RootBidFileManagerComponent.razor`**: nearly identical.
  Only the first is used (from Bid Overview). The root one shows every bid's documents and isn't
  ported.
- **`DetailsTab.razor` and `ProjectTabBase.cs`**: unused; Project Overview uses `ProjectDetailsTab.razor`.
- **`ProjectOverView.razor.cs`**: not used, because the `.razor` file has its own `@code`.
- **`JobDetailsrazor.razor`** (an empty page) and **`AddNewRows.razor`** (a test copy of Create
  Budget's add-row grid).

### One shared bid model

Project Management guessed `BidInfoDto` from how it was used; Estimation had the real
`DTO/BidInfoDto.cs`. `core/models/project-management/bid-info.model.ts` now re-exports the real
types from `core/models/estimation/`. Every field the Project Overview tabs use is in the real one.

### Calls that cross modules (to clean up later)

Some Project Management and Accounting pages call what are really Estimation or Bids operations.
Project Overview's tabs use `IEstimationService` methods, and Accounting's Add Form is mostly an
Estimation form. Each copy is marked in `core/services/project-overview.service.ts` and
`core/services/accounting-bid-info.service.ts` to be removed once the real service can be used.

### Guessed and confirmed routes and models

`Common/GlobalEndpoints.cs` only has some of the routes. Many are plain strings inside the C#
services, and some DTOs live in odd places (`DTO/CodeCodeSummaryRecord.cs` holds about 20
unrelated DTOs). Each `<module>-endpoints.ts` and `core/models/<module>/*.ts` file says which items
were read from source and which were guessed. Check those notes before relying on a route or field.

### Other things to look at

- **The PO Queue was an empty page in Blazor** (no code, no data). (Since then the PO module was
  built from the Moqups design: PO and CO queues, request forms, Accounting approval and Sage
  posting.)
- **Two likely bugs in the Bids pages, handled differently.** `BidQueueOverviewTabBase.cs` seems to
  swap the Bid Phase and Bid Status option lists; that's copied as is, so please confirm. Both bid
  tabs also saved `GC_ZipCode` from the job site's zip instead of the contractor's; that one was
  fixed in Angular.
- **The Division dropdown in Accounting and Estimation** has fixed values that look like
  SharePoint or Graph group GUIDs, not rows from a Division table. Copied as is; worth confirming.
- Forms use Angular reactive forms with `FormArray` for the repeating rows (bid amounts, phases,
  employees, budget lines). Add-row popups became inline forms.

## Phase 3: Contacts, Document Management, Reporting Dashboard, Phoenix Admin

After this phase every module in `NavMenu.razor` had a real route.

### Seven pages that are empty in Blazor too

`OppsPipeline/Index.razor`, `Hr/Index.razor` and BizOps's BIReports, Compliance, DevOps, Legal,
SysOps and VendorManagement pages are each just `<h3>Title</h3><hr />` with no code. I checked each
one. They use a shared `StubPageComponent` (`pages/stub-page/`) instead of the "not converted yet"
`PlaceholderComponent`.

### What was built

- **Contacts** (`pages/contacts/`): a company directory with a tab per security group, at
  `/contacts`. The Contacts menu link had no `href` in Blazor.
- **Document Management** (`pages/document-management/`): one file browser used by two pages, the
  library for all jobs and the folder for one project. It isn't in the menu; the top bar's
  Document Management button (which did nothing in Blazor either) is where it should be linked.
- **Reporting Dashboard** (`pages/reporting-dashboard/`): a landing page and eight reports (Cost
  Code Summary, Cash Flow Forecast, Cash Flow To Date, Prime Change List, Invoice Receivable, AR
  Invoice List, Contract Summary, Job Summary Report) under `/reporting-dashboard/*`. They reuse the
  Phase 2 services.
- **Phoenix Admin** (`pages/stowell-admin/`): a landing page, Project Access Management (giving
  employees project roles) and Disconnect Users (signing everyone out), under `/stowell-admin/*`.

### The bids document manager

`RootBidFileManagerComponent.razor` doesn't belong to Document Management, which has its own pair
(`FileManagerComponent.razor` and `RootFileManagerComponent.razor`, both ported). It shows every
bid's documents with its own API prefix and route, and it still isn't ported. One place to browse
both bid and general documents would be a new feature.

### Security notes on Phoenix Admin

- In Blazor the Employee dropdown in Project Access Management came from one fixed security group.
  (Since then it uses the full employee list in `dbo.StowellUsers`.)
- Nothing shows the server checking that the admin using the page may grant the roles it lists.
  That needs checking on the server; the UI can't fix it.
- Disconnect Users signed out every user with one click, no confirmation, and always said
  "success" even when it failed. The Angular page asks for confirmation first and reports failures
  honestly. Both are deliberate changes; say if you want the original behaviour back.

### Other things to look at

- **Two Blazor bugs copied as is** in the reports: the AR Invoice List's "Invoice#" and "Job"
  columns show each other's data, and Contract Summary's Balance With Tax, Retained and Net Due With
  Tax are always `$0.00` with no data behind them. Both need backend follow-up.
- **One Blazor bug fixed**: Project Access Management's search by email never worked (it searched a
  field that was always empty). The Angular page searches the assignment emails.
- PDF and Excel export was disabled at this point. (Since then the reports export to PDF, Excel and
  Word through the Syncfusion grid, see `core/utils/report-export.util.ts`. The Cash Flow Report,
  Cost Code Summary and Job Summary in Project Management still need a library for PDF and Excel.)
- `FileManager.razor`, an unlinked Syncfusion upload demo, wasn't ported.

## Phase 4: Syncfusion Angular components

You confirmed a Syncfusion account (Community licence), so the free stand-ins from Phases 1 to 3
were replaced with Syncfusion Angular packages.

### What changed

- **Charts**: all five (the four dashboard charts and the Reporting tab's pie) moved from Chart.js
  to `@syncfusion/ej2-angular-charts`, keeping each chart's type. `chart.js` and `ng2-charts` were
  removed from `package.json` after checking nothing used them. (Since then the dashboard charts
  have been redesigned, still on Syncfusion.)
- **Grids**: every HTML table used as a data grid is now a Syncfusion `ejs-grid` with paging,
  sorting and filtering. The row editors in the forms were left alone, since they're forms, not grids.
- **Calendar**: became a Syncfusion `ejs-schedule`. (Since then the dashboard calendar is a custom
  month view with an Add event button.)
- **File managers**: Document Management and the bid file manager use Syncfusion's FileManager. A
  viewer for PDF, Word and Excel was added. (Since then, on 2026-09-17, that viewer was dropped: Word
  needed a conversion service that doesn't exist and Excel opened blank, so files open in a new tab.)
- **Contacts**: the tabs stay as plain buttons. The page is cards, not a grid, so a tab component
  adds nothing.

### Config changes

- `package.json` lists the `@syncfusion/ej2-angular-*` packages, pinned to `34.2.6`. Check your
  Syncfusion account for the version your licence covers and change the pin if needed.
- `src/main.ts` calls `registerLicense()` with the same key as the Blazor `Program.cs`, as you
  asked. Keys are usually account-wide, but if a component shows a licence watermark, check
  "Manage License Keys" for an Angular key.
- `src/index.html` loads Syncfusion's `bootstrap5.css` theme from their CDN, the same theme as the
  Blazor app. (Since then `ThemeService` swaps it for the dark theme in dark mode.)
- `src/environments/environment.ts` and `environment.prod.ts` use the real Azure AD `clientId` from
  `appsettings.json` (`87fa7e85-fbd2-4d87-9358-eb64b7277f92`), as you asked. See "Running this
  locally" for the step you still need to do in Azure.

### Open questions from this phase

- Some chart details weren't confirmed for this version: whether several column series sit side by
  side by default, and the exact `dashArray` format.
- **The biggest gap**: Syncfusion's FileManager expects one URL that handles read, create, rename,
  delete and search through an `action` field, with every response shaped as `{cwd, files, error}`.
  The existing `DocumentManagementService` and `BidFileService` methods don't match that, and there's
  no `api/DocumentManagement/*` or `api/BidsDocumentManagement/*` controller in the source we had.
  The file managers need backend work before they'll handle real files.
- FileManager makes its own requests, not through `HttpClient`, so `MsalInterceptor` doesn't add a
  token to them. `onBeforeSend` is the placeholder for that.
- Admin Panel opens a project's assignments with its own expand and collapse, not the grid's
  `detailTemplate`. (Since then the project list is a plain table, so each project's panel opens
  right under its row.)

## Running this locally

The early phases were built somewhere with no npm access, so they were only checked with
`tsc --noEmit`. The app now installs and builds normally:

```
cd stowellco-angular
npm install
npm start        # ng serve, http://localhost:4200
```

Before running:

1. In the Azure Portal, open the App Registration (ClientId
   `87fa7e85-fbd2-4d87-9358-eb64b7277f92`), go to Authentication, "Add a platform", choose
   "Single-page application", and add `http://localhost:4200` and your production address as
   redirect URIs. That sits next to the Blazor app's Web platform; you don't need a second
   registration. If MSAL shows `AADSTS9002326` ("cross-origin token redemption"), the redirect URI
   went under "Web" instead of "Single-page application".
2. Point `apiBaseUrl` in `environment.ts` at your running `StowellCoAPI`.
3. If your Syncfusion licence covers a different version, update the `34.2.6` pins in
   `package.json` and the theme URL in `index.html`.
4. The `AzureAd`, `SharePoint` and `MicrosoftGraph` `ClientSecret` in `appsettings.json` was not
   rotated, because you asked to keep the config as is. The exposure from earlier in this
   conversation is still live.

Once it runs, the first things likely to need attention are the FileManager request format
(document features won't load or save files until a backend matches Syncfusion's format) and the
missing sign-in token on FileManager's requests.
