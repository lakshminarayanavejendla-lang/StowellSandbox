import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FileManagerModule } from '@syncfusion/ej2-angular-filemanager';
import { DocumentManagementService } from '../../../../core/services/document-management.service';
import { DocumentFileEntry, DocumentManagementScope } from '../../../../core/models/document-management/document-file.model';

/**
 * The file manager for both document pages, ported from FileManagerComponent.razor and
 * RootFileManagerComponent.razor. It's a Syncfusion <ejs-filemanager>. The project page
 * (document-management/project/:projectId) and the root page (document-management) differ only in
 * the `scope` and `folder` inputs.
 *
 * Read this before building the backend. ajaxSettings comes from
 * DocumentManagementService.getFileManagerAjaxSettings() and uses the existing routes in
 * document-management-endpoints.ts. But FileManager talks to them in its own way, not the way the
 * old service methods assumed. From Syncfusion's FileManager docs:
 *   - ajaxSettings.url handles read, create, delete, rename, search and details as one POST with an
 *     `action` field in the body.
 *   - Every response must be { cwd, files, error }. listEntries returns a plain array. This is the
 *     biggest gap: a backend built for the old shape won't work with FileManager.
 *   - Upload posts multipart data to uploadUrl with Syncfusion's field names (uploadFiles, plus path
 *     and action=save), which may not match uploadFile()'s `file` field.
 *   - Download POSTs to downloadUrl with a `downloadInput` JSON string and expects the raw file,
 *     not the query-string GET that getDownloadUrl() builds.
 * There's no DocumentManagement controller in what we have, so whoever builds it should follow
 * Syncfusion's contract, not the old @deprecated methods in DocumentManagementService.
 *
 * Sign-in: FileManager makes its own requests, not through HttpClient, so MsalInterceptor doesn't
 * add a token to them. Only HttpClient calls get one. onBeforeSend is the place to add it, but how to
 * set a header from BeforeSendEventArgs isn't confirmed, so it's still open.
 *
 * Opening files: PDF, Word and Excel were shown in the page for a while, but Word needed a conversion
 * service that was never built and Excel came up blank (2026-09-17). Now they open in a new tab: the
 * browser shows PDFs, and Word and Excel download or open in the user's app. Other files download.
 *
 * The folder tree, drag-and-drop, cut/copy/paste, multi-select, icon views, context menu and
 * virtual scrolling all come from FileManager itself.
 */
@Component({
  selector: 'app-file-browser',
  standalone: true,
  imports: [FileManagerModule],
  templateUrl: './file-browser.component.html',
  styleUrl: './file-browser.component.scss',
})
export class FileBrowserComponent implements OnChanges {
  @Input({ required: true }) scope!: DocumentManagementScope;
  @Input({ required: true }) folder!: string;

  private documentService = inject(DocumentManagementService);

  ajaxSettings: { url: string; uploadUrl: string; downloadUrl: string; getImageUrl: string } | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['folder'] && this.folder) {
      this.ajaxSettings = this.documentService.getFileManagerAjaxSettings(this.scope, this.folder);
    }
  }

  // BeforeSendEventArgs is { action, ajaxSettings, cancel } in Syncfusion's docs (see "Sign-in" at
  // the top). It does nothing for now instead of guessing how to add a header. Replace it with the
  // right method when sign-in is wired up here.
  onBeforeSend(_args: unknown): void {
    // TODO(auth): add the sign-in token here once the right BeforeSendEventArgs field is confirmed
    // for the installed @syncfusion/ej2-angular-filemanager. Otherwise these calls skip MsalInterceptor.
  }

  // FileOpenEventArgs is { cancel, fileDetails, module }. The docs only call fileDetails "the
  // selected item as JSON", so it's assumed to match DocumentFileEntry.
  // Opening PDF, Word and Excel inside the page didn't work: Word needed a conversion service that
  // was never built and Excel loaded a blank sheet (Mike Smith, 2026-09-17). So the file's URL opens
  // in a new tab. The browser shows PDFs, and Word and Excel open in the user's own app. GetFile was
  // tested and returns the right bytes.
  onFileOpen(args: { cancel: boolean; fileDetails?: DocumentFileEntry }): void {
    const details = args.fileDetails;
    if (!details || details.isFile === false) {
      return; // folder navigation - FileManager handles this itself, nothing to dispatch.
    }
    const ext = (details.type ?? this.extensionOf(details.name)).toLowerCase();
    const url = this.documentService.getFileUrl(this.folder, details.filterPath ?? '', details.name);

    if (this.isPreviewable(ext)) {
      args.cancel = true; // stop FileManager's own default file-open handling.
      window.open(url, '_blank');
      return;
    }

    // Other types: no preview. FileManager's default open runs, which downloads unknown types.
  }

  private isPreviewable(ext: string): boolean {
    return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'].includes(ext);
  }

  private extensionOf(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot) : '';
  }
}
