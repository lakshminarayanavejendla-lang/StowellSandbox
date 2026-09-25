import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BidsEndpoints } from '../bids-endpoints';
import { BidFileEntry } from '../models/bids/bid-file.model';

/**
 * Port of the file-operations side of BidFileManagerComponent(Base).razor(.cs) - the Blazor
 * original wired Syncfusion's paid SfFileManager straight to
 * api/BidsDocumentManagement/{FileOperations,FileUpload,FileDownload,GetFile} via
 * FileManagerAjaxSettings, whose exact request/response contract is defined by Syncfusion's
 * server SDK, not by a StowellCoApp DTO we could inspect (the BidsDocumentManagement controller
 * itself wasn't part of the staged source - only DTO/FileOperationDto.cs's neutral
 * FileDirectoryContent/FileDetails/ErrorDetails shapes were found).
 *
 * This service assumes a plain REST-ish contract (list via GET+rootPath query param, upload via
 * multipart POST, delete via DELETE+body) loosely modeled on that AJAX protocol, replacing the
 * paid grid per HANDOFF.md's "free component library" decision. CONFIRM the real controller's
 * contract before wiring this up for real data - it may need reshaping (e.g. Syncfusion's
 * action-based multi-purpose endpoint vs. this simpler list/upload/delete split).
 *
 * UPDATE (Syncfusion FileManager swap): `bid-file-manager.component` now renders a real
 * `<ejs-filemanager>` pointed at `getFileManagerAjaxSettings()` below instead of the free
 * upload/list/delete table. Same caveat as document-management.service.ts's equivalent update -
 * FileManager's actual request/response contract for read/create/rename/delete/upload is
 * Syncfusion's own fixed shape (see bid-file-manager.component.ts's header comment for the full
 * disclosure), NOT the plain-REST one `listFiles`/`uploadFile`/`deleteFile` below assume. Those
 * three methods are no longer called from bid-file-manager.component (checked: nothing else
 * calls them either) - left in place as a record of the earlier contract rather than deleted,
 * same reasoning as document-management.service.ts.
 */
@Injectable({ providedIn: 'root' })
export class BidFileService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /**
   * Builds the `ajaxSettings` object Syncfusion's `<ejs-filemanager>` expects (see
   * document-management.service.ts's `getFileManagerAjaxSettings` for the confirmed field
   * shape/contract disclosure - identical reasoning applies here). No `BidFileGetImageUrl` route
   * exists in `BidsEndpoints` (only Operations/Upload/Download/Get), so `getImageUrl` is omitted;
   * this is expected to only affect FileManager's thumbnail/large-icons image-preview mode, not
   * its default Details view - flagging in case that gap turns out to matter.
   *
   * `rootPath` (this bid's folder scope, i.e. `bidId`) is appended as a `?rootPath=` query param
   * on each URL, same reasoning as document-management's `folder` param - FileManager's
   * ajaxSettings model has no separate field to carry a scoping value like this through.
   */
  getFileManagerAjaxSettings(rootPath: string): { url: string; uploadUrl: string; downloadUrl: string } {
    const withRoot = (path: string) => `${this.base}${path}?rootPath=${encodeURIComponent(rootPath)}`;
    return {
      url: withRoot(BidsEndpoints.BidFileOperationsUrl),
      uploadUrl: withRoot(BidsEndpoints.BidFileUploadUrl),
      downloadUrl: withRoot(BidsEndpoints.BidFileDownloadUrl),
    };
  }

  /** @deprecated superseded by Syncfusion FileManager's own ajaxSettings-driven read - see getFileManagerAjaxSettings(). */
  listFiles(rootPath: string): Observable<BidFileEntry[]> {
    return this.http
      .get<BidFileEntry[]>(`${this.base}${BidsEndpoints.BidFileOperationsUrl}`, { params: { rootPath } })
      .pipe(catchError(() => of([])));
  }

  /** @deprecated superseded by Syncfusion FileManager's own ajaxSettings-driven upload - see getFileManagerAjaxSettings(). */
  uploadFile(rootPath: string, file: File): Observable<boolean> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post(`${this.base}${BidsEndpoints.BidFileUploadUrl}`, formData, {
        params: { rootPath },
        observe: 'response',
      })
      .pipe(
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  /** @deprecated superseded by Syncfusion FileManager's own ajaxSettings-driven delete - see getFileManagerAjaxSettings(). */
  deleteFile(rootPath: string, name: string): Observable<boolean> {
    return this.http
      .request('DELETE', `${this.base}${BidsEndpoints.BidFileOperationsUrl}`, {
        params: { rootPath },
        body: { name },
        observe: 'response',
      })
      .pipe(
        map((res) => res.ok),
        catchError(() => of(false))
      );
  }

  // Mirrors OnFileOpenHandler's window.open(...) call for PDFs in the Blazor source.
  getFileUrl(rootPath: string, filterPath: string, name: string): string {
    const params = new URLSearchParams({ filterPath, rootPath, name });
    return `${this.base}${BidsEndpoints.BidFileGetUrl}?${params.toString()}`;
  }
}
