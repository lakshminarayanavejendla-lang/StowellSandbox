import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentManagementEndpoints } from '../document-management-endpoints';
import { DocumentFileEntry, DocumentManagementScope, ProjectFolderDetails } from '../models/document-management/document-file.model';

/**
 * File operations for Document Management, ported from FileManagerComponent(Base) and
 * RootFileManagerComponent(Base) in the Blazor app. Those used Syncfusion's SfFileManager against
 * api/DocumentManagement/* and api/RootDocumentManagement/*. We don't have that controller's source,
 * so its exact contract is unconfirmed.
 *
 * file-browser.component uses Syncfusion's <ejs-filemanager>, pointed at getFileManagerAjaxSettings().
 * FileManager sends its own read/create/rename/delete/upload requests, so the five methods marked
 * @deprecated below aren't called anywhere. They're kept as a record of the earlier table-based
 * contract. getFileUrl, getDownloadUrl and getProjectFolderDetails are still in use.
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
   * The ajaxSettings object for <ejs-filemanager>: url, uploadUrl, downloadUrl and getImageUrl.
   * FileManager decides the request bodies and expects a {cwd, files, error} response, so only the
   * backend controller can change that shape.
   *
   * ajaxSettings has no field for extra parameters, so `folder` goes on every URL as ?folder=.
   * Check that the backend reads it from the query string.
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

  /** @deprecated FileManager reads folders itself (see getFileManagerAjaxSettings). */
  listEntries(scope: DocumentManagementScope, folder: string, path: string): Observable<DocumentFileEntry[]> {
    return this.http
      .get<DocumentFileEntry[]>(`${this.base}${this.operationsUrl(scope)}`, { params: { folder, path } })
      .pipe(catchError(() => of([])));
  }

  /** @deprecated FileManager creates folders itself (see getFileManagerAjaxSettings). */
  createFolder(scope: DocumentManagementScope, folder: string, path: string, name: string): Observable<boolean> {
    return this.http
      .post(`${this.base}${this.operationsUrl(scope)}`, { action: 'create', folder, path, name }, { observe: 'response' })
      .pipe(
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  /** @deprecated FileManager renames itself (see getFileManagerAjaxSettings). */
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

  /** @deprecated FileManager deletes itself (see getFileManagerAjaxSettings). */
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

  /** @deprecated FileManager uploads to uploadUrl with its own field names (see getFileManagerAjaxSettings). */
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

  // Same GetFile URL as the Blazor OnFileOpenHandler. Both scopes use api/DocumentManagement/GetFile,
  // even Root, as the original did.
  getFileUrl(folder: string, filterPath: string, name: string): string {
    const params = new URLSearchParams({ folder, filterPath: filterPath ?? '', name });
    return `${this.base}${DocumentManagementEndpoints.GetFileUrl}?${params.toString()}`;
  }

  // Link for the toolbar's Download action. The Blazor app has separate endpoints for downloading
  // (FileDownloadUrl) and opening (GetFile), so this is kept apart from getFileUrl.
  getDownloadUrl(scope: DocumentManagementScope, folder: string, path: string, name: string): string {
    const params = new URLSearchParams({ folder, path, name });
    return `${this.base}${this.downloadUrl(scope)}?${params.toString()}`;
  }

  /**
   * Calls Project Management's GetJobCodeDetails, as FileManagerComponentBase did. It lives here
   * instead of using project-overview.service.ts so this module doesn't depend on that one. Once
   * that dependency is fine, delete this and call the Project Management service directly.
   */
  getProjectFolderDetails(projectId: string): Observable<ProjectFolderDetails | null> {
    return this.http
      .get<ProjectFolderDetails>(`${this.base}${DocumentManagementEndpoints.GetJobCodeDetailsUrl}/${projectId}`)
      .pipe(catchError(() => of(null)));
  }
}
