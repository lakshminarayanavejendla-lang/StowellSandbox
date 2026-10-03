import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JobAccessLogService } from '../../../core/services/job-access-log.service';
import { AuthService } from '../../../core/services/auth.service';
import { OverviewTabComponent } from './tabs/overview-tab/overview-tab.component';
import { ProjectDetailsTabComponent } from './tabs/project-details-tab/project-details-tab.component';
import { PoTabComponent } from './tabs/po-tab/po-tab.component';
import { CoTabComponent } from './tabs/co-tab/co-tab.component';
import { InvoicesTabComponent } from './tabs/invoices-tab/invoices-tab.component';
import { ReportingTabComponent } from './tabs/reporting-tab/reporting-tab.component';
import { DocumentsTabComponent } from './tabs/documents-tab/documents-tab.component';
import { BudgetTabComponent } from './tabs/budget-tab/budget-tab.component';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// 'po' comes from the Moqups design (page TAB-Job PO Overview); Blazor didn't have it.
//
// 'co', 'invoices' and 'documents' come from the updated Moqups. Its tab bar is Overview, Details,
// Purchase Orders, Change Orders, Invoices, Reporting and Documents, which splits Change Orders and
// Invoices off the old "$ PO" tab and adds Documents. 'financials' stays, since removing a working
// tab is a bigger decision than adding new ones.
//
// 'budget' was asked for by Mike Smith ("Don't forget budget tab like in moqup"). The mockup's
// TAB-Budget/Financials page (Total Budget, Total Paid, Total Remaining, Set Budget and Budget Log)
// had no tab before. See budget-tab.component.ts for its data.
type TabKey = 'overview' | 'details' | 'budget' | 'po' | 'co' | 'invoices' | 'reporting' | 'documents';

// The Project Overview page (/ProjectManagement/ProjectOverview/{ProjectId:int} in Blazor). The tabs
// switch in place, not as separate routes, like Blazor's ActiveTab and SwitchTab.
//
// The route parameter is called "jobId" here (Blazor used ProjectId) to match the existing routes.
//
// Not ported: ProjectOverView.razor.cs (ProjectOverviewBase) has its own model and loading code, but
// the .razor page never inherits it and uses its own @code block, so it looks like a leftover file.
@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [PageHeaderComponent, 
    OverviewTabComponent,
    ProjectDetailsTabComponent,
    BudgetTabComponent,
    PoTabComponent,
    CoTabComponent,
    InvoicesTabComponent,
    ReportingTabComponent,
    DocumentsTabComponent,
  ],
  templateUrl: './project-overview.component.html',
  styleUrl: './project-overview.component.scss',
})
export class ProjectOverviewComponent implements OnInit {
  constructor(private route: ActivatedRoute) {}

  private jobAccessLogService = inject(JobAccessLogService);
  private authService = inject(AuthService);

  projectId = 0;
  activeTab: TabKey = 'overview';

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('jobId')) || 0;

    // Record the visit in the job access log (see job-access-log.component.ts). It doesn't wait for the
    // result, so a logging failure never stops anyone viewing the job.
    if (this.projectId) {
      const userEmail = this.authService.getLoggedInUserEmail() ?? 'Unknown User';
      this.jobAccessLogService.logAccess(String(this.projectId), userEmail).subscribe();
    }
  }

  switchTab(tab: TabKey): void {
    this.activeTab = tab;
  }
}
