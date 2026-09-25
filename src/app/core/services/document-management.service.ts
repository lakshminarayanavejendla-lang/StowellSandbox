import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentManagementEndpoints } from '../document-management-endpoints';
import { DocumentFileEntry, DocumentManagementScope, ProjectFolderDetails } from '../models/document-management/document-file.model';

/**
 * Port of the file-operations side of FileManagerComponent(Base).razor(.cs) and
 * RootFileManagerComponent(Base).razor(.cs) - the Blazor originals wired Syncfusion's paid
 * SfFileManager straight to api/DocumentManagement/* or api/RootDocumentManagement/* via
 * FileManagerAjaxSettings, whose exact request/response contract is defined by Syncfusion's
 * server SDK, not by anything we could inspect (no DocumentManagement controller exists in the
 * staged source at all - see document-management-endpoints.ts's header note).
 *
 * This service assumes a plain REST-ish contract loosely modeled on that AJAX protocol -
 * list via GET + folder/path query params, create-folder/rename via POST with an `action`
 * field, delete via DELETE + body, upload via multipart POST - replacing the paid grid per
 * HANDOFF.md's "free component library" decision (same approach as bid-file.service.ts).
 * CONFIRM the real controller's contract before wiring this up for real data.
 *
 * UPDATE (Syncfusion FileManager swap): `file-browser.component` now renders Syncfusion's real
 * `<ejs-filemanager>` instead of the free breadcrumb/table UI, pointed directly at
 * `getFileManagerAjaxSettings()` below. That means `listEntries`/`createFolder`/`renameEntry`/
 * `deleteEntry`/`uploadFile` are no longer called from file-browser.component (FileManager issues
 * its own read/create/rename/delete/upload requests straight to those URLs, per Syncfusion's own
 * AJAX contract - see file-browser.component.ts's header comment for exactly how that contract
 * differs from what these methods assume, e.g. the `{cwd, files, error}` response envelope
 * FileManager requires vs. the bare array `listEntries` returns here). Checked: nothing else in
 * the app calls these five methods either, so they're effectively dead code now - left in place
 * rather than deleted since they're a readable record of the earlier free-table contract, and
 * deleting them wasn't "strictly needed" for this task. `getFileUrl`/`getDownloadUrl`/
 * `getProjectFolderDetails` below are still live - file-browser.component still uses them for the
 * open-file viewer dispatch and the project-folder-name bridge.
 */
@Injectable({ providedIn: 'root' })
export class DocumentManagementService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  private operationsUrl(scope: DocumentManagementScope): string {
    return scope === 'root'
      ? DocumentManagementEndpoints.RootFileOperationsUrl
      : DocumentManagementEndpoints.ProjectFileOperationsUrl;
  }

  private uploadUrl(scope: DocumentManagementScope): string {
    return scope === 'root'
      ? DocumentManagementEndpoints.RootFileUploadUrl
      : DocumentManagementEndpoints.ProjectFileUploadUrl;
  }

  private downloadUrl(scope: DocumentManagementScope): string {
    return scope === 'root'
      ? DocumentManagementEndpoints.RootFileDownloadUrl
      : DocumentManagementEndpoints.ProjectFileDownloadUrl;
  }

  /**
   * Builds the `ajaxSettings` object Syncfusion's `<ejs-filemanager [ajaxSettings]="...">` expects
   * (CONFIRMED shape - `url`/`uploadUrl`/`downloadUrl`/`getImageUrl` string fields, per Syncfusion's
   * Angular FileManager API docs). Everything downstream of these four URLs - the request bodies
   * FileManager sends for read/create/rename/delete/search, and the `{cwd, files, error}` response
   * envelope it expects back - is Syncfusion's own fixed AJAX contract, NOT this project's earlier
   * inferred one (see this file's and file-browser.component.ts's header comments); nothing here
   * can control or adapt that shape from the Angular side, only the backend controller can.
   *
   * `folder` (this module's existing project/root scoping concept) is appended as a `?folder=`
   * query param on every URL, since FileManager's ajaxSettings model has no separate "extra
   * params" field to carry it through otherwise - CONFIRM the eventual backend controller reads
   * `folder` this way (as a query string on every action) rather than expecting it in the JSON
   * body FileManager itself controls.
   */
  getFileManagerAjaxSettings(
    scope: DocumentManagementScope,
    folder: string
  ): { url: string; uploadUrl: string; downloadUrl: string; getImageUrl: string } {
    const imageUrl =
      scope === 'root'
        ? DocumentManagementEndpoints.RootFileGetImageUrl
        : DocumentManagementEndpoints.ProjectFileGetImageUrl;
    const withFolder = (path: string) => `${this.base}${path}?folder=${encodeURIComponent(folder)}`;
    return {
      url: withFolder(this.operationsUrl(scope)),
      uploadUrl: withFolder(this.uploadUrl(scope)),
      downloadUrl: withFolder(this.downloadUrl(scope)),
      getImageUrl: withFolder(imageUrl),
    };
  }

  /** @deprecated superseded by Syncfusion FileManager's own ajaxSettings-driven read - see getFileManagerAjaxSettings(). Kept only as a record of the earlier free-table contract. */
  listEntries(scope: DocumentManagementScope, folder: string, path: string): Observable<DocumentFileEntry[]> {
    return this.http
      .get<DocumentFileEntry[]>(`${this.base}${this.operationsUrl(scope)}`, { params: { folder, path } })
      .pipe(catchError(() => of([])));
  }

  /** @deprecated superseded by Syncfusion FileManager's own ajaxSettings-driven create - see getFileManagerAjaxSettings(). */
  createFolder(scope: DocumentManagementScope, folder: string, path: string, name: string): Observable<boolean> {
    return this.http
      .post(`${this.base}${this.operationsUrl(scope)}`, { action: 'create', folder, path, name }, { observe: 'response' })
      .pipe(
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  /** @deprecated superseded by Syncfusion FileManager's own ajaxSettings-driven rename - see getFileManagerAjaxSettings(). */
  renameEntry(
    scope: DocumentManagementScope,
    folder: string,
    path: string,
    name: string,
    newName: string
  ): Observable<boolean> {
    return this.http
      .post(
        `${this.base}${this.operationsUrl(scope)}`,
        { action: 'rename', folder, path, name, newName },
        { observe: 'response' }
      )
      .pipe(
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  /** @deprecated superseded by Syncfusion FileManager's own ajaxSettings-driven delete - see getFileManagerAjaxSettings(). */
  deleteEntry(scope: DocumentManagementScope, folder: string, path: string, name: string): Observable<boolean> {
    return this.http
      .request('DELETE', `${this.base}${this.operationsUrl(scope)}`, {
        params: { folder, path },
        body: { name },
        observe: 'response',
      })
      .pipe(
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  /** @deprecated superseded by Syncfusion FileManager's own ajaxSettings-driven upload (which posts to `uploadUrl` with its own multipart field names - see getFileManagerAjaxSettings()). */
  uploadFile(scope: DocumentManagementScope, folder: string, path: string, file: File): Observable<boolean> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post(`${this.base}${this.uploadUrl(scope)}`, formData, {
        params: { folder, path },
        observe: 'response',
      })
      .pipe(
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  // Mirrors OnFileOpenHandler's GetFile URL construction. Reproduces the observed quirk (see
  // DocumentManagementEndpoints.GetFileUrl's comment) where BOTH scopes hit the same
  // api/DocumentManagement/GetFile route rather than Root using its own prefix.
  getFileUrl(folder: string, filterPath: string, name: string): string {
    const params = new URLSearchParams({ folder, filterPath: filterPath ?? '', name });
    return `${this.base}${DocumentManagementEndpoints.GetFileUrl}?${params.toString()}`;
  }

  // Plain-file download link (Details/toolbar "Download" action) - separate from getFileUrl
  // because the Blazor source keeps FileDownloadUrl and GetFile as two distinct AJAX endpoints
  // (download-as-attachment vs. open/preview), even though neither's real backend behavior was
  // confirmable here.
  getDownloadUrl(scope: DocumentManagementScope, folder: string, path: string, name: string): string {
    const params = new URLSearchParams({ folder, path, name });
    return `${this.base}${this.downloadUrl(scope)}?${params.toString()}`;
  }

  /**
   * Bridge to Project Management's IProjectOverviewService.GetJobCodeDetails, mirroring
   * FileManagerComponentBase.razor.cs. Ported here (rather than importing
   * core/services/project-overview.service.ts directly) to avoid a hard dependency on a
   * sibling module's file this phase was told not to edit - same cross-module-bridge pattern
   * as core/services/accounting-bid-info.service.ts. Delete this method and call the real
   * Project Management service directly once that's an acceptable dependency.
   */
  getProjectFolderDetails(projectId: string): Observable<ProjectFolderDetails | null> {
    return this.http
      .get<ProjectFolderDetails>(`${this.base}${DocumentManagementEndpoints.GetJobCodeDetailsUrl}/${projectId}`)
      .pipe(catchError(() => of(null)));
  }
}
