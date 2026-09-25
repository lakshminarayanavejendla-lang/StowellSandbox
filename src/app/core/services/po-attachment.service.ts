import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PoAttachment } from '../models/project-management/po-attachment.model';

/**
 * NEW service - Stowell PO Module. Backs the real file upload on FORM-PO Request / FORM-CO
 * Request, which was previously just a static "Drag and Drop / Browse" placeholder with no
 * upload wired up. Backend: PoAttachmentsController.cs - plain disk storage under
 * {ContentRoot}/Uploads/PoAttachments/{jobId}/, deliberately not reusing the existing
 * Syncfusion FileManager-backed BidsDocumentManagementController/FileManagerController (both are
 * full file browsers with a lot of half-finished SharePoint-via-Graph code, more than this needs).
 *
 * Files are keyed by job ID only, not by a specific PO/CO draft - the real PO/CO number doesn't
 * exist until Submit succeeds. A known simplification for this first pass.
 */
@Injectable({ providedIn: 'root' })
export class PoAttachmentService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  upload(jobId: string, files: File[]): Observable<PoAttachment[]> {
    const formData = new FormData();
    formData.append('jobId', jobId);
    files.forEach((f) => formData.append('files', f, f.name));

    return this.http
      .post<PoAttachment[]>(`${this.base}api/PoAttachments/Upload`, formData)
      .pipe(catchError(() => of([])));
  }

  list(jobId: string): Observable<PoAttachment[]> {
    return this.http
      .get<PoAttachment[]>(`${this.base}api/PoAttachments/List/${jobId}`)
      .pipe(catchError(() => of([])));
  }

  delete(jobId: string, storedName: string): Observable<boolean> {
    return this.http
      .delete<{ deleted: boolean }>(`${this.base}api/PoAttachments/Delete/${jobId}/${encodeURIComponent(storedName)}`)
      .pipe(
        map((res) => res.deleted),
        catchError(() => of(false))
      );
  }

  downloadUrl(jobId: string, storedName: string): string {
    // files keep their real names now (spaces, brackets ...), so the name has to be URL-encoded
    return `${this.base}api/PoAttachments/Download/${jobId}/${encodeURIComponent(storedName)}`;
  }
}
