import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { FileBrowserComponent } from '../../../../document-management/components/file-browser/file-browser.component';
import { DocumentManagementService } from '../../../../../core/services/document-management.service';

/**
 * The Documents tab (Moqups page TAB-Documents). It uses <app-file-browser> and
 * DocumentManagementService.getProjectFolderDetails(), the same pair as project-file-manager.component.ts,
 * instead of repeating the folder logic. That component reads the project id from its route, but
 * this tab sits inside Project Overview (whose parameter is "jobId"), so it takes projectId as an
 * @Input like the other tabs.
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
