import { Routes } from '@angular/router';
import { DocumentLibraryComponent } from './document-library/document-library.component';
import { ProjectFileManagerComponent } from './project-file-manager/project-file-manager.component';

/**
 * Document Management module routes - merged into app.routes.ts's children array by whoever
 * owns that file (per this phase's collision-avoidance rules, this file does not edit
 * app.routes.ts directly - it's already imported there as `DOCUMENT_MANAGEMENT_ROUTES`).
 *
 * Route paths, mapped from the real @page directives:
 *   - Blazor `@page "/DocManagement/Main"` (RootFileManagerComponent.razor) -> 'document-management'
 *     (the module's index/landing page - global "browse everything" document library).
 *   - Blazor `@page "/DocManagement/Project/{ProjectId:int}"` (DocManagementComponent.razor) ->
 *     'document-management/project/:projectId' (one project's document folder).
 * Lowercased/kebab-cased to match this app's existing route convention (e.g.
 * 'project-management', 'bids/bid-overview').
 *
 * NOT reserved by any Phase 1 placeholder - this module isn't linked from NavMenu.razor at all;
 * the topbar's "Document Management" button (main-layout.component.html) has no click handler
 * in either the Blazor source or this port (flagged as dead in HANDOFF.md's Phase 1 section),
 * and per-project links presumably come from other modules' "Documents" buttons once those are
 * wired to point here. 'document-management' is the sensible landing path for that topbar
 * button once someone wires it up.
 *
 * NOT ported here: a dedicated PDF/spreadsheet/Word viewer route (Blazor's PdfViewer.razor,
 * SpreadSheetViewer.razor, DocumentViewer.razor, Viewer.razor). Per this phase's task brief and
 * the "free component library" decision, PDFs open via the browser's native PDF rendering in a
 * new tab and Word/Excel files fall back to a flagged download - both handled directly inside
 * FileBrowserComponent.openFile() rather than as separate routed pages, since there's no paid
 * viewer being embedded that would need its own page/route. See that component's header comment
 * for the full viewer-library decision and free-library alternatives if inline preview is
 * wanted later.
 *
 * Also NOT ported: FileManager.razor (@page "/file-manager/directory-upload") - an
 * unlinked Syncfusion demo/dev-test page (directory-upload sample with commented-out
 * dropdown-button code), not referenced from DocManagementComponent.razor, FileManager
 * Component.razor, or RootFileManagerComponent.razor. Dead code, same category as Phase 1's
 * ColumnChart1.razor/LineChart1.razor finding.
 */
export const DOCUMENT_MANAGEMENT_ROUTES: Routes = [
  { path: 'document-management', component: DocumentLibraryComponent, data: { title: 'Document Management' } },
  {
    path: 'document-management/project/:projectId',
    component: ProjectFileManagerComponent,
    data: { title: 'Project Documents' },
  },
];
