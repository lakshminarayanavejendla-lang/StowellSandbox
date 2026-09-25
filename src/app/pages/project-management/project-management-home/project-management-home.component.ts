import { Component } from '@angular/core';
import { CurrentJobsComponent } from '../../dashboard/components/current-jobs/current-jobs.component';

// Port of Components/Pages/ProjectManagement/ProjectManagement.razor (@page "/ProjectManagement/").
// The Blazor page is just a header + the same <CurrentJobs> grid the Dashboard uses, plus a
// "Project Document Library" link that opens DocManagement/Main in a new tab - Document
// Management is its own not-yet-converted module (out of scope for this phase), so that link
// is left as a plain external-looking href rather than an Angular route for now.
@Component({
  selector: 'app-project-management-home',
  standalone: true,
  imports: [CurrentJobsComponent],
  templateUrl: './project-management-home.component.html',
  styleUrl: './project-management-home.component.scss',
})
export class ProjectManagementHomeComponent {}
