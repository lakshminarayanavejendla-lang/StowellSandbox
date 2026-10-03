import { Routes } from '@angular/router';

/**
 * Document Management routes, imported in app.routes.ts as DOCUMENT_MANAGEMENT_ROUTES.
 *
 *   'document-management': the shared library across all jobs (/DocManagement/Main in Blazor).
 *   'document-management/project/:projectId': one job's folder (/DocManagement/Project/{ProjectId}).
 *
 * The menu doesn't link here, and the top bar's Document Management button had no click handler in
 * Blazor either. 'document-management' is where that button should go once it's wired up; job pages
 * can link to the project route.
 *
 * There are no viewer routes for PDF, Excel or Word (Blazor's PdfViewer, SpreadSheetViewer,
 * DocumentViewer and Viewer pages). FileBrowserComponent opens files in a new tab instead (see its
 * header).
 *
 * FileManager.razor (/file-manager/directory-upload) isn't ported either. It was an unlinked
 * Syncfusion demo page that nothing used.
 */
export const DOCUMENT_MANAGEMENT_ROUTES: Routes = [
  { path: 'document-management', loadComponent: () => import('./document-library/document-library.component').then((m) => m.DocumentLibraryComponent), data: { title: 'Document Management' } },
  {
    path: 'document-management/project/:projectId',
    loadComponent: () => import('./project-file-manager/project-file-manager.component').then((m) => m.ProjectFileManagerComponent),
    data: { title: 'Project Documents' },
  },
];
