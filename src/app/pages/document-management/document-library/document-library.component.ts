import { Component } from '@angular/core';
import { FileBrowserComponent } from '../components/file-browser/file-browser.component';

/**
 * Port of RootFileManagerComponent.razor/RootFileManagerComponentBase.razor.cs
 * (@page "/DocManagement/Main") - the global "browse everything" document library, as opposed
 * to ProjectFileManagerComponent's one-project-at-a-time scope.
 *
 * RootFileManagerComponentBase.OnInitializedAsync reads selectedFolderName straight from
 * Config["FileSettings:FolderName"] - a server-side app-settings value, not anything resolved
 * per-request. That config value isn't available to the SPA at all (same category of gap as
 * BidFileManagerComponent's rootPath note: "the actual root share path prefix ... isn't
 * available client-side"). ROOT_FOLDER_NAME below is a placeholder pending either (a) the API
 * resolving the folder server-side without needing it from the client, or (b) a real endpoint
 * that returns the configured folder name.
 */
@Component({
  selector: 'app-document-library',
  standalone: true,
  imports: [FileBrowserComponent],
  templateUrl: './document-library.component.html',
  styleUrl: './document-library.component.scss',
})
export class DocumentLibraryComponent {
  // INFERRED placeholder - see header comment. Confirm the real FileSettings:FolderName value
  // (or better, an endpoint that returns it) before treating this as correct.
  readonly rootFolderName = 'root';
}
