import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileBrowserComponent } from '../components/file-browser/file-browser.component';
import { DocumentManagementService } from '../../../core/services/document-management.service';

/**
 * Port of DocManagementComponent.razor (@page "/DocManagement/Project/{ProjectId:int}") +
 * FileManagerComponent.razor/FileManagerComponentBase.razor.cs (confusingly named
 * `BidFileManagerComponentBase` in the .cs file despite living in DocumentManagement, not
 * Bids - reproduced as found, not renamed).
 *
 * FileManagerComponentBase.OnInitializedAsync resolves the project's document folder via
 * IProjectOverviewService.GetJobCodeDetails(ProjectId) - selectedFolderName comes from
 * jobcodedetails.FullJob. That bridge call is ported into DocumentManagementService rather than
 * importing Project Management's own project-overview.service.ts directly, to avoid touching a
 * sibling module's files this phase wasn't told to (see that service method's header comment).
 */
@Component({
  selector: 'app-project-file-manager',
  standalone: true,
  imports: [FileBrowserComponent],
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
    // FIX - this HTTP call runs through the MSAL interceptor, whose callbacks land outside
    // Angular's zone (same root cause fixed elsewhere this session, e.g. overview-tab.component.ts,
    // new-po-form.component.ts) - without ngZone.run()/detectChanges() the component's fields do
    // update but the view never re-renders, so the page stays on "Loading project details..."
    // forever even when the request succeeds. (getProjectFolderDetails already maps HTTP errors
    // to `null`, which the notFound branch below already covers.)
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
