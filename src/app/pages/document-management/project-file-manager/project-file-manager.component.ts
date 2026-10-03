import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileBrowserComponent } from '../components/file-browser/file-browser.component';
import { DocumentManagementService } from '../../../core/services/document-management.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * One job's documents (/DocManagement/Project/{ProjectId} in Blazor), from DocManagementComponent.razor
 * and FileManagerComponent.razor. (Its .cs class is named BidFileManagerComponentBase even though
 * it's in DocumentManagement.)
 *
 * The folder name is the job's FullJob from GetJobCodeDetails(ProjectId), as in Blazor. That call is
 * in DocumentManagementService so this page doesn't depend on project-overview.service.ts.
 */
@Component({
  selector: 'app-project-file-manager',
  standalone: true,
  imports: [PageHeaderComponent, FileBrowserComponent],
  templateUrl: './project-file-manager.component.html',
  styleUrl: './project-file-manager.component.scss',
})
export class ProjectFileManagerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private documentService = inject(DocumentManagementService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  projectId = '';
  jobName = '';
  folderName = '';
  isResolved = false;
  notFound = false;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    if (!this.projectId) {
      this.notFound = true;
      return;
    }
    // The MSAL interceptor's callbacks run outside Angular's zone, so without ngZone.run() and
    // detectChanges() the page stays on "Loading project details..." even when the request works
    // (the same fix as overview-tab and new-po-form). An HTTP error comes back as null, which the
    // notFound branch handles.
    this.documentService.getProjectFolderDetails(this.projectId).subscribe((details) => {
      this.ngZone.run(() => {
        if (!details || !details.fullJob) {
          this.notFound = true;
          this.cdr.detectChanges();
          return;
        }
        this.jobName = details.jobName;
        this.folderName = details.fullJob;
        this.isResolved = true;
        this.cdr.detectChanges();
      });
    });
  }
}
