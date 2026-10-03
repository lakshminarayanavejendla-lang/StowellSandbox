import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FileManagerModule } from '@syncfusion/ej2-angular-filemanager';
import { BidFileService } from '../../../../../core/services/bid-file.service';
import { BidFileEntry } from '../../../../../core/models/bids/bid-file.model';

/**
 * A bid's documents, from BidFileManagerComponent.razor, using Syncfusion's <ejs-filemanager>. It's
 * the Documents tab in BidOverviewComponent and also the 'bids/documents/:bidId' page.
 *
 * It works like file-browser.component.ts, but against api/BidsDocumentManagement/*. The same
 * warnings apply, so read that file's header:
 *   - FileManager needs { cwd, files, error } responses, and BidFileService.listFiles() returns a
 *     plain array. That's the biggest gap; getFileManagerAjaxSettings() only builds the URLs.
 *   - Upload and download send different data from the old uploadFile and getFileUrl methods.
 *   - FileManager's requests skip MsalInterceptor, and onBeforeSend is still a placeholder.
 * Unlike Document Management there are no folders here (one folder per bid, as in Blazor), and
 * there's no image route, so getImageUrl is left out (see bid-file.service.ts).
 *
 * PDF, Word and Excel open in a new tab. Showing them in the page didn't work: Word needed a
 * conversion service that was never built and Excel came up blank (2026-09-17; see onFileOpen).
 *
 * RootBidFileManagerComponent.razor still isn't ported.
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
      // Blazor used Config["BidsDocSettings:RootSharePath"] + "\" + BidId. This assumes the API
      // works out the root share path itself from the bid id.
      this.rootPath = this.bidId;
      this.ajaxSettings = this.bidFileService.getFileManagerAjaxSettings(this.rootPath);
    }
  }

  // Same open sign-in question as onBeforeSend in file-browser.component.ts.
  onBeforeSend(_args: unknown): void {
    // TODO(auth): add the sign-in token here once the right BeforeSendEventArgs field is confirmed.
    // Otherwise these calls skip MsalInterceptor.
  }

  // Opens the file's URL in a new tab instead of showing it in the page (Mike Smith, 2026-09-17).
  // See onFileOpen in file-browser.component.ts for why.
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
    // Other types: FileManager's default open runs, which downloads the file, as in Blazor.
  }

  private extensionOf(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot) : '';
  }
}
