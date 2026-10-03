import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PoAttachment } from '../models/project-management/po-attachment.model';

/**
 * File uploads on the PO Request and CO Request forms. PoAttachmentsController.cs saves them to
 * disk under {ContentRoot}/Uploads/PoAttachments/{jobId}/. It doesn't reuse the FileManager
 * controllers, which are full file browsers with unfinished SharePoint code.
 *
 * Files are stored by job, not by PO or CO, because the PO or CO number only exists after Submit.
 * That's a known shortcut for now.
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
    // File names keep spaces, brackets and so on, so encode the name for the URL.
    return `${this.base}api/PoAttachments/Download/${jobId}/${encodeURIComponent(storedName)}`;
  }
}
