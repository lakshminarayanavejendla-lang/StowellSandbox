import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { FileBrowserComponent } from '../../../../document-management/components/file-browser/file-browser.component';
import { DocumentManagementService } from '../../../../../core/services/document-management.service';

/**
 * NEW tab - client-updated Moqups (page TAB-Documents). Reuses the existing Document Management
 * module's <app-file-browser> + DocumentManagementService.getProjectFolderDetails() - the exact
 * same pair project-file-manager.component.ts (document-management/project/:projectId route)
 * already uses - rather than duplicating that folder-resolution logic. Not a copy of
 * ProjectFileManagerComponent itself: that component reads its project id from the ROUTE
 * (":projectId" param), but this tab lives inside Project Overview's own routed component (param
 * name "jobId") and isn't itself router-outlet-mounted, so it takes projectId as an @Input like
 * every other tab on this page instead.
 */
@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [FileBrowserComponent],
  templateUrl: './documents-tab.component.html',
  styleUrl: './documents-tab.component.scss',
})
export class DocumentsTabComponent implements OnChanges {
  @Input({ required: true }) projectId!: number;

  private documentService = inject(DocumentManagementService);
  private cdr = inject(ChangeDetectorRef);

  jobName = '';
  folderName = '';
  isResolved = false;
  notFound = false;

  ngOnChanges(): void {
    if (!this.projectId) return;

    this.isResolved = false;
    this.notFound = false;

    this.documentService.getProjectFolderDetails(String(this.projectId)).subscribe((details) => {
      if (!details) {
        this.notFound = true;
        this.cdr.detectChanges();
        return;
      }
      this.jobName = details.jobName;
      this.folderName = details.fullJob;
      this.isResolved = true;
      this.cdr.detectChanges();
    });
  }
}
