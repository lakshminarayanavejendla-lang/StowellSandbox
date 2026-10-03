import { Component } from '@angular/core';
import { FileBrowserComponent } from '../components/file-browser/file-browser.component';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * The shared document library across all jobs (/DocManagement/Main in Blazor), from
 * RootFileManagerComponent.razor. ProjectFileManagerComponent shows one job instead.
 *
 * Blazor read the folder name from the server setting FileSettings:FolderName, which the browser
 * can't see. ROOT_FOLDER_NAME is a placeholder until the API works out the folder itself or has an
 * endpoint that returns it.
 */
@Component({
  selector: 'app-document-library',
  standalone: true,
  imports: [PageHeaderComponent, FileBrowserComponent],
  templateUrl: './document-library.component.html',
  styleUrl: './document-library.component.scss',
})
export class DocumentLibraryComponent {
  // A guessed placeholder (see the header). Check the real FileSettings:FolderName value, or better,
  // get it from an endpoint.
  readonly rootFolderName = 'root';
}
