# StowellCoApp: Blazor → Angular

Converted in three phases, per your direction to go **shell + dashboard, phases by phases**:
Phase 1 (this section) built the shell and Dashboard; Phase 2 added Project Management, Bids,
Estimation, and Accounting; Phase 3 (bottom of this doc) added Contacts, Document Management,
Reporting Dashboard, and Phoenix Admin — every module reachable from `NavMenu.razor` now has a
real route. None of this has been `npm install`'d/`ng build`'d for real (no registry access in
the sandbox this was built in) — see "Running this locally" before treating anything here as
verified beyond "the TypeScript itself is sound."

## ⚠️ Security findings (unrelated to the conversion itself, please act on these)

1. **`appsettings.json` has plaintext secrets checked into the zip**: a real Azure AD
   `ClientSecret`, and matching `ClientSecret` values under `SharePoint` and `MicrosoftGraph`
   (all three appear to be the same secret reused across sections), plus a SQL Server
   connection string. Since this file has now passed through this conversation, treat that
   secret as exposed and **rotate it in the Azure AD app registration** as soon as convenient,
   then keep the new one out of source control (user secrets / Key Vault / environment
   variables instead of appsettings.json).
2. **Hardcoded Syncfusion license key** in `Program.cs` — same "committed secret" issue, lower
   severity since it's a license key rather than an auth credential, but worth moving to config.
3. **CORS policy allows any origin/method/header** (`AllowAllOrigins` in `Program.cs`). Fine for
   local dev, but should be locked down to the actual Angular app's origin(s) before this API is
   used by anything but localhost.

None of this blocks the Angular work; flagging it now because rotating a leaked secret is time-sensitive.

## What Phase 1 covers

- **Shell**: left sidebar (logo + nav), top bar (search box, Quick Shortcut dropdown, Copilot
  button, Document Management button, Password Management, Support, Logout, right-menu toggle),
  right icon bar (Contractor Foreman / BuzzBID / Monday PM / Monday CRM / Quickbooks / ADP /
  ChatGPT external links), footer. Routing covers every link in the original `NavMenu.razor`.
- **Dashboard**: Current Jobs table (search + paging), a calendar/agenda widget, and the four
  chart widgets (Cash Collected vs Cash Paid, Retain Amount line chart, Net Cash Out, Total
  Retain Hi/Low stacked chart).
- **Auth wiring**: MSAL Angular scaffolding (`core/auth/msal.config.ts`), an `authGuard` on the
  layout route, and an HTTP interceptor that attaches bearer tokens to calls against the API
  base URL — see "Decisions that need your sign-off" below, this one specifically.

## Decisions made without your explicit sign-off (please confirm or redirect)

**UI component library — went free instead of the Radzen/Syncfusion Angular equivalents.**
Earlier I said I'd default to the Angular counterparts of Radzen.Blazor/Syncfusion.Blazor since
that's the closest visual match. Once I got into actually building this, I didn't want to
commit you to licensing costs you haven't confirmed you have for the Angular-specific packages
(Radzen for Angular and Syncfusion's `ej2-angular-*` packages are licensed separately from the
Blazor ones you're already paying for). So Phase 1 ships with:
- **Chart.js via `ng2-charts`** instead of `RadzenChart` — free, MIT-licensed.
- **A plain HTML table** instead of `RadzenDataGrid` for Current Jobs — free, no grid library at all yet.
- **A custom agenda-list widget** instead of `RadzenScheduler` — this is the biggest visual gap
  versus the original; a real month/week/day calendar grid needs a scheduler library (Radzen,
  Syncfusion, or a free one like Angular Calendar / FullCalendar).

Everything is isolated behind clean component boundaries (`current-jobs`, `*-chart`,
`calendar-widget`) specifically so swapping any of these for the licensed Radzen/Syncfusion
Angular components later is a contained change, not a rewrite. Tell me which way to go and I'll
swap them in Phase 2.

**Auth — MSAL Angular (client-side), not a BFF.** This means tokens are held in the browser
rather than server-side. It's the simpler path and mirrors what most Angular/Azure AD SPAs do,
but it's a different trust model than the Blazor Server app had (where the token never left the
server). If your security posture needs tokens kept out of the browser entirely, the alternative
is a small backend-for-frontend proxy — say the word and I'll restructure around that instead.
Either way, **the new Angular app needs its own Azure AD app registration** with platform type
"Single-page application" — the existing registration in `appsettings.json` is type "Web" and
its `ClientSecret` cannot be used by a SPA (public clients don't have secrets). I left
`environment.ts`'s `clientId` as a placeholder for this reason.

## Things I couldn't fully verify — please double check

- **`CurrentJob` and the root `ChartData`/`ChartDataset` C# classes were never found as a single
  source of truth.** `IJobService.cs` and the chart components all reference `StowellCoApp.DTO.ChartData` /
  `CurrentJob` via `@using StowellCoApp.DTO`, but the `DTO` and `Models` folders (I listed both in full)
  don't contain files defining them. The only concrete definitions I found were nested,
  duplicated copies inside `ColumnChart1.razor` and `LineChart1.razor` (`ChartData { Labels,
  Datasets }`, `ChartDataset { Label, Data, BackgroundColor, BorderColor }`) and inside
  `CalendarPage.razor` (`MyEventViewModel { Subject, Start, End, Organizer }`). I modeled the
  Angular interfaces (`src/app/core/models/*.ts`) on those shapes plus how the fields get used
  elsewhere (search predicates on `CurrentJob`, `dataset.Label == "Cash Collected"` checks), but
  this is inference, not a confirmed contract. Worth checking directly against what
  `StowellCoAPI`'s controllers actually return before wiring this up for real data.
- **Likely dead/duplicate Blazor components, not ported:**
  - `TopBar.razor` — an unused alternate top bar; `MainLayout.razor` inlines its own topbar directly instead of using this component.
  - `Components/Layout/QuickShortcut.razor` — a third, standalone copy of the same "Quick Shortcut" dropdown that MainLayout and NavMenu each already duplicate inline. Consolidated into one `<app-quick-shortcut>` component used from the shell.
  - `ColumnChart1.razor` / `LineChart1.razor` — appear to be earlier/alternate drafts of `ColumnChart.razor` / `LineChart.razor` (same purpose, different implementation); `Dashboard.razor` only references the non-"1" versions, so those are what got ported.

  If any of these three are actually live and I've mischaracterized them, let me know and I'll port them too.
- **`MainLayout.razor`'s Logout button links straight to `https://phoenixdesigns.proserv360.tech/`**
  rather than the app's own `/authentication/logout` route (which is what `NavMenu.razor`'s logout
  button and `Dashboard`'s auth flow use elsewhere). Ported as-is since that's what the source
  does, but it looks like it might be a leftover rather than intentional — confirm which behavior you want.

## Phase 2: Project Management, Bids/Opportunities, Estimation, Accounting

Converted all four at once, in parallel, per your "all 4" — each module was built by an
independent pass over the real Blazor source (not just the Phase 1 stubs), so the routes below
go further than what Phase 1 guessed at.

### What's now real (replacing Phase 1's PlaceholderComponent stubs)

- **Project Management** (`pages/project-management/`): Project Queue, a tabbed Project Overview
  (Overview/Project Details/Financials/Reporting tabs, one page not four routes), Project Budget
  Configuration, Create Budget, New PO Form, and three drill-in reports (Cash Flow Report,
  Cost Code Summary, Job Summary) each keyed by `:projectId`.
- **Bids / Opportunities** (`pages/bids/`): Current Bids, Bid Queue, New Bid, Bid Overview
  (with Summary/Details tabs and a per-bid document manager), plus a documents-only route.
- **Estimation** (`pages/estimation/`): Bid Queue (Open/Closed/Pending), and one shared
  `BidFormComponent` used for both "Add Bid" and "Edit Bid" (the two Blazor pages, `AddBid.razor`
  and `EditBidForm.razor`, were ~99% identical - see flag below).
- **Accounting** (`pages/accounting/`): Accounting Queue (landing/active-projects grid), PO Queue,
  Add Form (bid→project onboarding), and Budget Approval (shared by "new" and "modify" budget
  flows - same reason as Estimation's shared form, see below).

### New routes, not in Phase 1's guessed stub list

Phase 1 only stubbed the nav-menu's top-level links; once the real source was read, several
pages turned out to need their own routes (deep links from grids/tabs, edit forms, reports).
Full list is in each module's `<module>.routes.ts` file; the ones that weren't guessable from
`NavMenu.razor` alone: `bids/bid-overview/:bidId/:type`, `bids/documents/:bidId`,
`estimation/edit-bid/:jobId`, `project-management/project-overview/:jobId` sub-reports
(`cash-flow-report`, `cost-code-summary`, `job-summary`), `project-budget-configuration/:action/:projectId`,
and Accounting's `add-form/:jobId` / `approve-new-budget/:projectId` / `approve-modify-budget/:projectId`.

### Confirmed duplicate/dead code (consolidated, not double-built)

- **`AddBid.razor` / `EditBidForm.razor`** (Estimation): ~99% identical field-for-field. Built as
  one `BidFormComponent` - Edit additionally reverse-populates from `GetBidDetails` and shows a
  "Send For Approval" button. Split them back out later if the two ever genuinely diverge.
- **`ApproveNewBudget.razor` / `ApproveModifyBudget.razor`** (Accounting): markup is byte-for-byte
  identical; the code-behind for "modify" even still calls methods literally named
  `ApproveNewBudget()`/`RejectNewBudget()` - copy/paste that was never renamed. Built as one
  `BudgetApprovalComponent` with a `mode: 'new' | 'modify'` route flag.
- **`BidFileManagerComponent.razor` / `RootBidFileManagerComponent.razor`** (Bids): ~99%
  byte-identical, differing only in API route and scope. Only `BidFileManagerComponent` is
  actually referenced (from Bid Overview); `RootBidFileManagerComponent` browses *all* bids'
  documents at once and reads like a Document Management module page that happens to sit in the
  Bids folder - skipped here, flagging for you to decide if it belongs in a future
  Document Management phase instead.
- **`DetailsTab.razor` + `ProjectTabBase.cs`** (Project Management): an unused stub;
  `ProjectOverView.razor` actually renders `ProjectDetailsTab.razor` for the "details" case.
- **`ProjectOverView.razor.cs`** (Project Management): orphaned - the `.razor` file has no
  `@inherits` and defines its own inline `@code` instead.
- **`JobDetailsrazor.razor`** and **`AddNewRows.razor`** (Project Management): an empty unlinked
  shell and a standalone dev-test duplicate of Create Budget's add-row grid, respectively.

### Model reconciliation

The Project Management and Estimation agents both needed `BidInfoDto` (it's used by Project
Overview's tabs *and* by Estimation's bid form) but worked from different evidence: Project
Management only had usage sites to infer from, Estimation had the real `DTO/BidInfoDto.cs`. I
reconciled this after both finished - `core/models/project-management/bid-info.model.ts` now just
re-exports the confirmed types from `core/models/estimation/`, instead of keeping two
slightly-different shapes alive. No component changes were needed; every field the Project
Management tabs use is present in the confirmed shape.

### Cross-module dependencies these phases created (temporary bridges, flagged for cleanup)

Several Project Management and Accounting pages call what are really *Estimation* or *Bids*
backend operations (Project Overview's tabs call `IEstimationService` methods; Accounting's
Add Form is mostly an Estimation-service-backed bid→project onboarding form, not a PO form).
Each of these was ported into the calling module's own service file with a code comment marking
it as a bridge to delete once that dependency's real Angular service is confirmed and can be
imported directly instead - search `core/services/project-overview.service.ts` and
`core/services/accounting-bid-info.service.ts` for the specifics.

### Inferred vs. confirmed endpoints and models — the short version

A recurring pattern across every phase (including Phase 1): `Common/GlobalEndpoints.cs` only
defines *some* of the routes each C# service actually calls; a lot of routes are raw string
literals inline in the service classes, and some DTOs referenced via `@using` don't live where
you'd expect (e.g. `DTO/CodeCodeSummaryRecord.cs` holds ~20 unrelated DTOs despite its name).
Every new `<module>-endpoints.ts` and `core/models/<module>/*.ts` file documents, per field/route,
whether it was read directly from source (confirmed) or reconstructed from how it's used
(inferred) - check those comments before treating any of this as a verified API contract,
especially before wiring real data through it.

### Other flags worth your attention

- **PO Queue is dead/unwired in the Blazor source itself** - no `@code`, no service injection,
  just static empty table markup. Ported as a structural placeholder; you'll need to decide
  whether a real PO queue is still a planned feature (and against what data) or the route should
  be dropped.
- **Two likely bugs found in the Bids module, handled differently:** `BidQueueOverviewTabBase.cs`
  assigns the Bid Phase and Bid Status dropdown option lists to the wrong variables (they look
  swapped) - reproduced exactly as observed, please confirm if intentional. Separately, both bid
  tabs' save logic set `GC_ZipCode` from the job-site zip instead of the general contractor's zip -
  this one was NOT reproduced (wired correctly in Angular instead), flagging in case that was
  actually intentional for some reason.
- **Hardcoded Division dropdown values** in Accounting/Estimation's forms look like SharePoint/
  Graph group GUIDs embedded directly in code rather than pulled from a real `Division` table -
  reproduced as-is, worth confirming.
- Every new form component uses Angular Reactive Forms with `FormArray` for repeating line-item
  sections (bid amounts, phases, employee assignments, budget lines) - no paid grid/modal library
  used, per the same free-components decision from Phase 1. Add/edit-row popups became inline
  forms instead of modals.
- Still couldn't `npm install`/`ng build` in this sandbox (no registry access) - every new file
  was manually type-checked with a bare `tsc --noEmit` pass (ignoring only the expected "can't
  resolve @angular/*" errors from missing `node_modules`) rather than a real Angular compile.
  Do a real `ng build` locally before trusting this beyond "the TypeScript itself is sound."

## Phase 3: Contacts, Document Management, Reporting Dashboard, Phoenix Admin

This closes out the conversion — every module reachable from `NavMenu.razor` now has a real
route (a couple of small ones turned out to be genuinely empty in the Blazor source itself, see
below). Also converted in parallel, same collision-avoidance approach as Phase 2.

### Seven pages that were stubs in the source app too

`OppsPipeline/Index.razor`, `Hr/Index.razor`, and BizOps's `{BIReports,Compliance,DevOps,Legal,
SysOps,VendorManagement}.razor` are, in the actual Blazor source, literally just `<h3>Title</h3><hr />`
— no code-behind, no service calls, nothing. I checked each file directly rather than assuming.
These are ported 1:1 via a shared `StubPageComponent` (`pages/stub-page/`) instead of the generic
"not converted yet" `PlaceholderComponent` — there's nothing left to build here unless the
Blazor app itself grows real content on one of them first.

### What's now real

- **Contacts** (`pages/contacts/`): a company directory grouped into security-group tabs
  (`ContactGroup`/`ContactGroupMember`), at `/contacts`. `NavMenu.razor`'s "Contacts" link has no
  `href` in the source — nothing currently points at this route; wire the nav link to it if wanted.
- **Document Management** (`pages/document-management/`): a shared file-browser component
  (breadcrumbs, upload, new folder, rename, delete, download) parameterized by scope, backing two
  real pages — a global document library and a per-project file manager. Not linked from
  `NavMenu.razor`; reachable once the topbar's "Document Management" button (dead in the Blazor
  source too, per Phase 1's notes) gets wired up.
- **Reporting Dashboard** (`pages/reporting-dashboard/`): a landing page plus eight reports
  (Cost Code Summary, Cash Flow Forecast, Cash Flow To-Date, Prime Change List, Invoice
  Receivable, AR Invoice List, Contract Summary, Job Summary Report) at `/reporting-dashboard/*`.
  Reused Phase 2's `ProjectCostCodeService`/`JobSummaryService`/`ReportingService` rather than
  duplicating them — this module's data needs were already covered.
- **Phoenix Admin** (`pages/stowell-admin/`): a landing page, Project Access Management
  (assign project roles to employees), and Disconnect Users (force-logout everyone), at
  `/stowell-admin/*` — matches the Phase 1 nav stub 1:1, plus two new sub-routes.

### A third orphaned file manager, now properly identified

Phase 2 flagged Bids' `RootBidFileManagerComponent.razor` as maybe belonging to Document
Management. It doesn't — Document Management has its own confirmed scoped/global pair
(`FileManagerComponent.razor` / `RootFileManagerComponent.razor`, both real and both ported here),
and `RootBidFileManagerComponent` is a third, still-distinct, still-unported sibling scoped
specifically to *all bids'* documents (different API prefix, different route). If you want a
unified "browse everything" experience across bids and general documents, that's a genuine new
feature decision, not something either phase already covered.

### Security-relevant flags from Phoenix Admin — please read these

- The Project Access Management page's "Employee" dropdown is scoped to one hardcoded
  security-group GUID in the Blazor source (reproduced verbatim) — confirm that group's
  membership is deliberately curated, since anyone in it can be granted project-role access here.
- Nothing in the source shows server-side authorization checking that *the admin using this page*
  is allowed to grant the roles it lists — flagging since this only becomes visible once you're
  looking at the actual permission model, not something a UI port alone can fix.
- Disconnect Users originally force-logs-out **every user, unconditionally, with one click and no
  confirmation** (and always shows "success" even if the call fails). I added a confirmation
  prompt and made success/failure reporting honest rather than reproducing either behavior exactly
  — flagging both as deliberate deviations in case you want the original behavior back.

### Other flags worth your attention

- **Two source bugs reproduced as-is** (not fixed) in Reporting Dashboard: AR Invoice List's
  "Invoice#"/"Job" columns are bound to the wrong fields (swapped), and Contract Summary's
  "Balance With Tax"/"Retained"/"Net Due With Tax" columns are hardcoded `$0.00` with no backing
  data in the source. Flagging both for backend follow-up rather than silently patching them.
- **One source bug NOT reproduced**: the Blazor "search by email" filter in Phoenix Admin's
  Project Access Management search never actually worked (filtered an always-empty field) — fixed
  in the Angular port to actually search assignment emails, called out as an intentional deviation.
- Every PDF/Excel export button across the new report pages is rendered but disabled with a
  tooltip, same precedent as Phase 2 — still no jsPDF/SheetJS decision made.
- Document Management's inline document preview is still an open decision: PDFs open via the
  browser's native rendering (works today, no library), but Word/Excel just fall back to
  download. SheetJS (spreadsheet) or `mammoth.js` (lossy `.docx`→HTML) are free options if inline
  preview is wanted later; full fidelity needs a paid Syncfusion Angular license either way.
- `FileManager.razor` (an unlinked Syncfusion directory-upload demo page) was dead code, not
  ported — same category as Phase 1's `ColumnChart1.razor` finding.
- Same npm/build caveat as every phase before it: no registry access in this sandbox, so this was
  checked with a bare `tsc --noEmit` pass, not a real `ng build`.

## Phase 4: swapped the free component stack for real Syncfusion Angular components

You confirmed you have a Syncfusion account (free/Community license) and gave the go-ahead, so
every free stand-in built across Phases 1-3 specifically to avoid an unconfirmed licensing cost
has now been replaced with the real Syncfusion Angular package it was standing in for. This also
resolves the "UI library" open decision that's been flagged since Phase 1.

### What changed, and what didn't

- **Charts** (all 5: Dashboard's 4 widgets + Project Overview's Reporting tab pie): Chart.js/
  ng2-charts → `@syncfusion/ej2-angular-charts` (`ejs-chart`/`ejs-accumulationchart`), matching
  each chart's original series type (grouped/stacked column, line, pie).
- **Grids**: every plain HTML `<table>` used as a real data grid, across every module, is now a
  Syncfusion `GridComponent` (`ejs-grid`) with paging/sorting/filtering. Reactive-Forms-driven
  line-item editors (Estimation/Accounting's Bid/Phase/Employee/budget-row add-forms) were
  deliberately left alone - those are forms, not grids, and swapping them would be a bigger
  redesign than "replace the grid library."
- **Dashboard's calendar widget**: the hand-built agenda-list placeholder → a real Syncfusion
  `ScheduleComponent` (`ejs-schedule`) with Day/Week/Month/Agenda views.
- **Document Management + Bids' file manager**: the plain breadcrumb/upload/list UI → real
  Syncfusion `FileManagerComponent` widgets, plus a new shared `document-viewer` component that
  dispatches PDF/Word/Excel files to `PdfViewerComponent`/`DocumentEditorContainerComponent`/
  `SpreadsheetComponent` instead of the old "download to view" fallback.
- **Contacts' tab strip**: deliberately left as-is (plain buttons) - it's card-based, not a grid,
  and a Tab component wouldn't add anything functional there. Documented as a judgment call.
- `chart.js`/`ng2-charts` are removed from `package.json` (nothing imports them anymore, confirmed
  by a repo-wide grep before removing them).

### Config changes made alongside the swap

- `package.json` now lists 15 `@syncfusion/ej2-angular-*` packages (grids, charts, schedule,
  filemanager, pdfviewer, documenteditor, spreadsheet, plus buttons/inputs/dropdowns/navigations/
  popups/layouts as supporting packages), all pinned to `^27.1.48` as a reasonable placeholder -
  **check your Syncfusion account dashboard for the version your license actually covers and
  adjust the pin if it differs.**
- `src/main.ts` now calls `registerLicense()` with the same key already hardcoded in the Blazor
  app's `Program.cs`, per your "use the same" instruction. Syncfusion license keys are normally
  account-wide (not framework-scoped), so this should work, but it hasn't been verified against
  your actual account - if any Syncfusion component shows a licensing watermark at runtime, check
  "Manage License Keys" in your Syncfusion account for the Angular-platform key specifically.
- `src/index.html` now loads Syncfusion's `bootstrap5.css` theme from their CDN, matching the
  Blazor app's own theme choice (`_content/Syncfusion.Blazor.Themes/bootstrap5.css`).
- `src/environments/environment.ts`/`environment.prod.ts`: the placeholder Azure AD `clientId` is
  now the real value from `appsettings.json` (`87fa7e85-fbd2-4d87-9358-eb64b7277f92`), per your
  "use the same" instruction. **One manual step still needed on your end**: in the Azure Portal,
  open this same App Registration → Authentication → "Add a platform" → "Single-page
  application", and register `http://localhost:4200` (and your real prod origin) as SPA redirect
  URIs. That's additive to the existing Web-platform entry the Blazor app uses - you don't need a
  second app registration. If MSAL Angular throws `AADSTS9002326` ("cross-origin token
  redemption"), that specifically means a redirect URI got added under "Web" instead of
  "Single-page application" - fix it there.

### Flags/uncertainties from this pass (none of this could be runtime-verified - no `ng build` here)

- Grid's `PageService`/`SortService`/`FilterService` need registering in each grid component's
  `providers` array (done throughout) - this is the documented Syncfusion Angular pattern but
  wasn't compiler- or runtime-verified.
- A few chart-API specifics aren't 100% confirmed at the pinned version: whether multiple
  `Column`-type series auto-cluster (dodge) by default, the exact `dashArray` string format for
  dashed lines, and whether `@syncfusion/ej2-angular-schedule` exports a `View` type (worked
  around by typing `views`/`currentView` as plain strings instead of guessing an import that
  might not resolve).
- Dashboard's Schedule doesn't display the `Organizer` field from `MyEventViewModel` - it's not
  one of Schedule's recognized default fields, so it rides along in the data but needs a custom
  `eventTemplate` to actually show it. Flagged as a visible regression versus the old agenda
  widget (which always showed the organizer) until that template gets built.
- **The single biggest open item**: Syncfusion FileManager expects a specific AJAX contract - one
  URL handling read/create/rename/delete/search via an `action` field, responses wrapped as
  `{cwd, files, error}`. The existing inferred `DocumentManagementService`/`BidFileService`
  methods (built in Phases 2-3 without a real backend controller to confirm against) do NOT match
  this shape. No backend controller for either `api/DocumentManagement/*` or
  `api/BidsDocumentManagement/*` exists in the staged Blazor source at all - so this was already
  an open gap, now just more precisely specified. Needs real backend work before either file
  manager will actually function against live data.
- Related: Syncfusion FileManager's AJAX calls don't route through Angular's `HttpClient`, so
  `MsalInterceptor` won't attach a bearer token to them automatically - flagged as a TODO
  (`onBeforeSend`) rather than guessed at.
- Word/Excel inline preview needs Syncfusion's own backend microservices (docx↔SFDT conversion,
  spreadsheet open/save) that don't exist in this repo or `StowellCoAPI` - PDF preview works off
  raw file bytes alone and needs no extra backend; Word/Excel do.
- Admin Panel's master-detail (expand a project row to see its assignments) uses the existing
  custom expand/collapse state rather than Grid's `detailTemplate` API, since that API's exact
  method names weren't confidently verifiable without a real build - a visual-only simplification,
  not a functional gap.

## Running this locally

This sandbox's npm registry access is blocked outright (a hard `403 Forbidden` from an org-level
network policy, confirmed by testing `npm install` directly - not something a retry or workaround
fixes), so **nothing in this project has ever been `npm install`'d, `ng build`'d, or `ng serve`'d**
across any phase, including this Syncfusion one. Every check performed here was a manual
`tsc --noEmit` pass (catches syntax/type errors, not template binding mistakes, missing
peer-dependency issues, or anything Syncfusion's actual runtime API surface might disagree with
what was written from memory). Treat this as "the TypeScript compiles cleanly," not "this runs."
Do the real build on your machine:

```
cd stowellco-angular
npm install
npm start        # ng serve, http://localhost:4200
```

Before running:
1. `src/environments/environment.ts`'s `azureAd.clientId`/`tenantId` are already filled in with
   the real values from `appsettings.json`, per your instruction to reuse them - but you still
   need to add a "Single-page application" platform entry with the SPA redirect URIs to that same
   app registration in the Azure Portal (see the Phase 4 section above for exactly where/why).
2. Point `apiBaseUrl` at your running `StowellCoAPI` instance.
3. Check your Syncfusion account's dashboard for the actual licensed package version and update
   the `^27.1.48` pins in `package.json` (and the theme CDN URL in `index.html`) if it differs.
4. The leaked `AzureAd`/`SharePoint`/`MicrosoftGraph` `ClientSecret` from `appsettings.json` was
   deliberately NOT rotated, per your instruction to use the same config as-is - just flagging
   again that this means the exposure from earlier in this conversation is still live, in case
   that changes your mind later.

Once it's running, the biggest things likely to need attention first are the two flagged in
Phase 4: the Syncfusion FileManager AJAX contract mismatch (Document Management and Bids'
document features won't actually load/save files correctly until a real backend controller
matches Syncfusion's expected request/response shape), and the MSAL bearer-token gap on
FileManager's own AJAX calls.
