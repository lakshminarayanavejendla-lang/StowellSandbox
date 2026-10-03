import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BidsEndpoints } from '../bids-endpoints';
import { BidFileEntry } from '../models/bids/bid-file.model';

/**
 * Bid documents, ported from BidFileManagerComponent(Base) in the Blazor app, which used Syncfusion's
 * SfFileManager against api/BidsDocumentManagement/*. We don't have that controller, only the
 * neutral shapes in DTO/FileOperationDto.cs, so the contract is unconfirmed.
 *
 * bid-file-manager.component uses <ejs-filemanager> pointed at getFileManagerAjaxSettings(), and
 * FileManager sends its own requests. listFiles, uploadFile and deleteFile aren't called anywhere;
 * they're kept as a record of the earlier simple REST version.
 */
@Injectable({ providedIn: 'root' })
export class BidFileService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /**
   * The ajaxSettings object for <ejs-filemanager> (see the same method in
   * document-management.service.ts). There's no image route for bids, so getImageUrl is left out.
   * That should only affect the thumbnail view, not the default Details view.
   *
   * The bid's folder (rootPath, the bid id) goes on every URL as ?rootPath=, because ajaxSettings
   * has no field for extra parameters.
   */
  getFileManagerAjaxSettings(rootPath: string): { url: string; uploadUrl: string; downloadUrl: string } {
    const withRoot = (path: string) => `${this.base}${path}?rootPath=${encodeURIComponent(rootPath)}`;
    return {
      url: withRoot(BidsEndpoints.BidFileOperationsUrl),
      uploadUrl: withRoot(BidsEndpoints.BidFileUploadUrl),
      downloadUrl: withRoot(BidsEndpoints.BidFileDownloadUrl),
    };
  }

  /** @deprecated FileManager reads folders itself (see getFileManagerAjaxSettings). */
  listFiles(rootPath: string): Observable<BidFileEntry[]> {
    return this.http
      .get<BidFileEntry[]>(`${this.base}${BidsEndpoints.BidFileOperationsUrl}`, { params: { rootPath } })
      .pipe(catchError(() => of([])));
  }

  /** @deprecated FileManager uploads itself (see getFileManagerAjaxSettings). */
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

  /** @deprecated FileManager deletes itself (see getFileManagerAjaxSettings). */
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

  // Opens a PDF in a new tab, as the Blazor file manager did.
  getFileUrl(rootPath: string, filterPath: string, name: string): string {
    const params = new URLSearchParams({ filterPath, rootPath, name });
    return `${this.base}${BidsEndpoints.BidFileGetUrl}?${params.toString()}`;
  }
}
