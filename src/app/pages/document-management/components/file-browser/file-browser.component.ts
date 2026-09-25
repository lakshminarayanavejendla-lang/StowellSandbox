import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FileManagerModule } from '@syncfusion/ej2-angular-filemanager';
import { DocumentManagementService } from '../../../../core/services/document-management.service';
import { DocumentFileEntry, DocumentManagementScope } from '../../../../core/models/document-management/document-file.model';

/**
 * Syncfusion-backed port of FileManagerComponent.razor / RootFileManagerComponent.razor - now a
 * real `<ejs-filemanager>` (`@syncfusion/ej2-angular-filemanager`) instead of the earlier
 * free-components breadcrumb/table stand-in (see HANDOFF.md's "free component library" decision
 * and git history for that version). Shared by both the project-scoped
 * ('document-management/project/:projectId') and root/global ('document-management') routes,
 * same as before - only `scope`/`folder` inputs differ between the two callers.
 *
 * === ajaxSettings / AJAX-contract disclosure (read this before wiring a real backend) ===
 *
 * `ajaxSettings` is built by `DocumentManagementService.getFileManagerAjaxSettings()`, pointed at
 * the SAME four route groups this module already had (`ProjectFileOperationsUrl`/
 * `RootFileOperationsUrl` etc. in document-management-endpoints.ts) - so no new URLs were
 * invented for this swap. However, Syncfusion's `<ejs-filemanager>` does NOT talk to those routes
 * the way the old free-table UI's `DocumentManagementService.listEntries/createFolder/
 * renameEntry/deleteEntry/uploadFile` methods assumed. Concretely, per Syncfusion's own Angular
 * FileManager docs (checked while building this):
 *   - `ajaxSettings.url` handles read/create/delete/rename/search/details via a single POST with
 *     an `action` field in the body - not `listEntries`'s separate GET-with-query-params, and not
 *     `createFolder`/`renameEntry`/`deleteEntry`'s DELETE-with-body/POST-with-body shape.
 *   - Every one of those actions' JSON response must be wrapped as `{ cwd, files, error }`
 *     (current directory details, sibling file list, and an error-or-null field) - `listEntries`
 *     here returns a bare `DocumentFileEntry[]` with no such wrapper today. THIS IS THE SINGLE
 *     BIGGEST CONTRACT GAP - a real backend built to satisfy the old inferred shape will NOT
 *     satisfy Syncfusion FileManager as-is.
 *   - Upload posts to `ajaxSettings.uploadUrl` as multipart form data with Syncfusion's own field
 *     naming (documented as `uploadFiles`, plus `path`/`action=save` alongside) - not confirmed to
 *     match `uploadFile()`'s current `file`-named field.
 *   - Download POSTs to `ajaxSettings.downloadUrl` with a `downloadInput` JSON-string field
 *     describing which files to fetch, expecting a raw file/blob response - not the
 *     `?folder&path&name` query-string GET `getDownloadUrl()` builds today.
 * None of this was "silently assumed to already match" - there's no real DocumentManagement/
 * RootDocumentManagement controller anywhere in the staged source either way (see
 * document-management-endpoints.ts's header note), so whoever builds one should target
 * Syncfusion's documented contract directly rather than the free-table-era shape still preserved
 * (as `@deprecated`, unused-by-this-component) methods in DocumentManagementService.
 *
 * === Auth flag ===
 * Syncfusion's FileManager issues its own AJAX calls internally (via ej2-base, not Angular's
 * `HttpClient`), so `app.config.ts`'s `MsalInterceptor` will NOT automatically attach a bearer
 * token to any FileManager read/create/rename/delete/upload/download request - only calls made
 * through `HttpClient` (like this project's other services, and `document-viewer.component`'s
 * blob fetch for Word/Excel preview) get that for free. A `(beforeSend)` handler is wired below as
 * a placeholder for attaching one manually; see `onBeforeSend`'s comment - this is flagged as
 * unresolved, not silently left broken, since the exact mechanism to inject a header from
 * `BeforeSendEventArgs` wasn't confirmed from the docs available while building this.
 *
 * === Viewer dispatch ===
 * FIX (2026-09-17) - PDFs/Word/Excel briefly rendered inline via a shared `<app-document-viewer>`
 * (Syncfusion PdfViewer/DocumentEditor/Spreadsheet), but Word needs a separate conversion service
 * that was never built and Excel's blob-open() silently produced a blank sheet - see `onFileOpen`.
 * Reverted to opening the file's direct URL in a new tab (browser-native PDF rendering,
 * download/open-in-app for Word/Excel). Anything else still falls back to a download, same as
 * before.
 *
 * NOT ported (native SfFileManager behavior that's now Syncfusion's own, real implementation -
 * nothing left to "not port"): folder tree/navigation, drag-drop upload/move, cut/copy/paste,
 * multi-select, thumbnail/large-icon view, context menu, virtualized scrolling all come from the
 * real `<ejs-filemanager>` widget itself.
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

  // BeforeSendEventArgs (per Syncfusion's API docs: { action, ajaxSettings, cancel }) - see the
  // class header's "Auth flag". Left as an explicit, visible no-op rather than a guessed
  // header-injection call, since the exact field to set wasn't confirmed here. Whoever wires up
  // real auth against this FileManager should replace this with the confirmed mechanism.
  onBeforeSend(_args: unknown): void {
    // TODO(auth): attach a bearer token to this request once the correct BeforeSendEventArgs
    // field for doing so is confirmed against the installed @syncfusion/ej2-angular-filemanager
    // version - FileManager's ajax calls bypass MsalInterceptor entirely otherwise.
  }

  // FileOpenEventArgs (confirmed fields per Syncfusion's API docs: { cancel, fileDetails, module }
  // - `fileDetails` itself is only documented as "currently selected item as JSON object", so its
  // shape is assumed here to line up with this module's own DocumentFileEntry, since that's what
  // the read-action response items need to contain regardless per the contract note above).
  // FIX (2026-09-17, Mike Smith - PDF/Word/Excel preview issues) - was routing previewable types
  // through the inline <app-document-viewer> (Syncfusion PdfViewer/DocumentEditor/Spreadsheet).
  // PDF happened to work for a valid file, but Word/Excel need a separate Syncfusion backend
  // conversion service that was never built (DocumentEditor) or only partially works via an
  // unconfirmed blob-open() call that silently produces a blank sheet (Spreadsheet - confirmed:
  // opened the UI shell but never loaded the real workbook data). Simplest reliable fix: open the
  // file's direct URL in a new tab instead - the browser renders PDFs natively, and Word/Excel
  // download/open in the user's own installed app, sidestepping the missing-service problem
  // entirely. GetFile itself is confirmed working (tested directly: 200, correct bytes).
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

    // Unsupported type - same "no inline preview, download instead" fallback as before the
    // Syncfusion swap, just no longer forcing a window.open() for PDFs (FileManager's default
    // open behavior for non-cancelled types is left to run, which is itself a download for
    // unknown extensions).
  }

  private isPreviewable(ext: string): boolean {
    return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'].includes(ext);
  }

  private extensionOf(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot) : '';
  }
}
