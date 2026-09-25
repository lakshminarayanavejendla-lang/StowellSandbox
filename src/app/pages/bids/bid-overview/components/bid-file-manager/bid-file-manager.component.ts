import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FileManagerModule } from '@syncfusion/ej2-angular-filemanager';
import { BidFileService } from '../../../../../core/services/bid-file.service';
import { BidFileEntry } from '../../../../../core/models/bids/bid-file.model';

/**
 * Syncfusion-backed port of BidFileManagerComponent.razor/BidFileManagerComponentBase.razor.cs -
 * now a real `<ejs-filemanager>` (`@syncfusion/ej2-angular-filemanager`), per this task's
 * explicit "replace the free stand-in file browser ... with real Syncfusion Angular equivalents"
 * scope. NOTE: this file was found mid-edit by a *different, parallel* pass when this task
 * started - an intermediate version had already swapped the plain HTML table for a Syncfusion
 * `ejs-grid` (`GridModule`) list, one step short of the full file-manager widget. This change
 * supersedes that intermediate `ejs-grid` version with the full `FileManagerComponent` widget
 * (folder-tree-free since there was never folder navigation here, but real toolbar/upload/
 * rename/delete UX instead of a bespoke grid), to match `file-browser.component`'s equivalent
 * swap and this task's brief. Flagging the collision rather than silently overwriting without
 * explanation, per this project's "flag, don't silently guess" convention.
 *
 * Same "same kind of component, same swap, different folder" relationship to
 * `file-browser.component` that this task's brief describes - see that component's header
 * comment for the full AJAX-contract disclosure; the same caveats apply here 1:1 against
 * `api/BidsDocumentManagement/*` instead of `api/DocumentManagement/*`/
 * `api/RootDocumentManagement/*`. Not re-explained in full here to avoid duplicating a wall of
 * text - read file-browser.component.ts's header comment for the details on:
 *   - the `{cwd, files, error}` response envelope Syncfusion FileManager requires that
 *     `BidFileService.listFiles()`'s bare-array return does NOT provide (biggest gap);
 *     `getFileManagerAjaxSettings()` here only builds the ajaxSettings URLs, not any adapter for
 *     that mismatch;
 *   - upload/download body-shape differences vs. the old `uploadFile`/`getFileUrl` methods;
 *   - the MsalInterceptor/auth bypass flag (`onBeforeSend` below is the same unresolved
 *     placeholder as file-browser.component's).
 * One difference from Document Management's version: no folder-tree navigation existed in the
 * Blazor original here either (a single flat per-bid folder), and no `BidFileGetImageUrl` route
 * is modeled in `BidsEndpoints`, so `getImageUrl` is omitted from ajaxSettings (see
 * bid-file.service.ts's `getFileManagerAjaxSettings` comment).
 *
 * FIX (2026-09-17) - previously used a shared `<app-document-viewer>` for PDF/Word/Excel inline
 * preview (Syncfusion PdfViewer/DocumentEditor/Spreadsheet). Word needs a separate conversion
 * service that was never built, and Excel's blob-open() silently produced a blank sheet - see
 * onFileOpen's comment. Reverted to opening the file's direct URL in a new tab.
 *
 * Used both as the "Documents" tab inside BidOverviewComponent and as the standalone
 * 'bids/documents/:bidId' route, same as before.
 *
 * STILL NOT ported: RootBidFileManagerComponent.razor - see this file's earlier header comment
 * (preserved in git history) for the full "which one is actually wired up" analysis; unchanged by
 * this Syncfusion swap.
 */
@Component({
  selector: 'app-bid-file-manager',
  standalone: true,
  imports: [FileManagerModule],
  templateUrl: './bid-file-manager.component.html',
  styleUrl: './bid-file-manager.component.scss',
})
export class BidFileManagerComponent implements OnChanges {
  @Input({ required: true }) bidId!: string;

  private bidFileService = inject(BidFileService);

  rootPath = '';
  ajaxSettings: { url: string; uploadUrl: string; downloadUrl: string } | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bidId'] && this.bidId) {
      // Mirrors BidFileManagerComponentBase.OnInitializedAsync's
      // Config["BidsDocSettings:RootSharePath"] + "\" + BidId - see this file's earlier version
      // (git history) for the full note on why this assumes the API resolves the root share path
      // server-side from bidId alone. Unchanged by the Syncfusion swap.
      this.rootPath = this.bidId;
      this.ajaxSettings = this.bidFileService.getFileManagerAjaxSettings(this.rootPath);
    }
  }

  // See file-browser.component.ts's onBeforeSend for the same unresolved auth-header caveat.
  onBeforeSend(_args: unknown): void {
    // TODO(auth): attach a bearer token here once the correct BeforeSendEventArgs field for doing
    // so is confirmed - FileManager's ajax calls bypass MsalInterceptor entirely otherwise.
  }

  // FIX (2026-09-17, Mike Smith - PDF/Word/Excel preview issues) - see file-browser.component.ts's
  // onFileOpen for the full explanation (Word needs a never-built conversion service, Excel's
  // blob-open() silently produced a blank sheet). Opens the file's direct URL in a new tab instead
  // of the inline Syncfusion viewer.
  onFileOpen(args: { cancel: boolean; fileDetails?: BidFileEntry }): void {
    const details = args.fileDetails;
    if (!details || details.isFile === false) {
      return;
    }
    const url = this.bidFileService.getFileUrl(this.rootPath, details.filterPath ?? '', details.name);
    const ext = (details.type ?? this.extensionOf(details.name)).toLowerCase();

    if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'].includes(ext)) {
      args.cancel = true;
      window.open(url, '_blank');
    }
    // else: unsupported type falls back to FileManager's own default open behavior, same
    // "download instead" outcome the Blazor original's commented-out preview logic left in place.
  }

  private extensionOf(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot) : '';
  }
}
