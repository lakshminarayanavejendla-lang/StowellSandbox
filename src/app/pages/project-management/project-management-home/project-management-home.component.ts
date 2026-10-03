import { Component } from '@angular/core';
import { CurrentJobsComponent } from '../../dashboard/components/current-jobs/current-jobs.component';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// From ProjectManagement.razor (/ProjectManagement/): a header, the Current Jobs grid the dashboard
// uses, and a "Project Document Library" link that opened DocManagement/Main in a new tab. That link
// is still a plain href, not an Angular route. No route uses this page now; Project Management opens
// the Project Queue.
@Component({
  selector: 'app-project-management-home',
  standalone: true,
  imports: [PageHeaderComponent, CurrentJobsComponent],
  templateUrl: './project-management-home.component.html',
  styleUrl: './project-management-home.component.scss',
})
export class ProjectManagementHomeComponent {}
