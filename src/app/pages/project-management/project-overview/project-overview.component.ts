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

// 'po' - NEW tab added per the original "Stowell PO Module" Moqups design spec (page
// TAB-Job PO Overview), not part of the original Blazor source.
//
// 'co' / 'invoices' / 'documents' - NEW tabs added per the CLIENT-UPDATED Moqups (17-page
// refresh of the same "Stowell PO/CO Module" design doc). That update's tab bar is
// Overview/Details/Purchase Orders/Change Orders/Invoices/Reporting/Documents - i.e. it splits
// Change Orders and Invoices out of the old combined "$ PO" tab and adds Documents. 'financials'
// is kept as its own tab regardless (removing an existing, working tab is a bigger call than
// adding new ones).
//
// 'budget' - NEW tab, confirmed by Mike Smith directly ("Don't forget budget tab like in
// moqup") rather than left as an open flag: the mockup's page TAB-Budget/Financials (Total
// Budget/Total Paid/Total Remaining + Set Budget + Budget Log) had no home in the tab bar -
// this closes that gap. See budget-tab.component.ts's header comment for the data source.
type TabKey = 'overview' | 'details' | 'budget' | 'po' | 'co' | 'invoices' | 'reporting' | 'documents';

// Port of Components/Pages/ProjectManagement/ProjectOverView.razor
// (@page "/ProjectManagement/ProjectOverview/{ProjectId:int}"). Renders Overview/Details/
// Financials/Reporting as in-place tabs (a client-side switch, not four separate routes) -
// exactly how the Blazor source does it via its `ActiveTab`/`SwitchTab` state, just moved from
// server-rendered @switch to an Angular @switch over a signal-free plain field.
//
// Route param: this app's stub used ":jobId" (see app.routes.ts) where the Blazor source uses
// "{ProjectId:int}" - read via the "jobId" name to match the existing stub/shell routing.
//
// FLAG - dead code not ported: ProjectOverView.razor.cs (class ProjectOverviewBase) defines an
// entirely separate ProjectOverviewModel/OnInitializedAsync/SetTab, but ProjectOverView.razor
// has NO `@inherits ProjectOverviewBase` directive - it defines its own inline @code block
// instead (ActiveTab/SwitchTab, both no-op re: data fetching, which is commented out in the
// source). ProjectOverView.razor.cs looks like an orphaned/superseded file; not ported.
@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [
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

    // NEW - job access audit trail (see job-access-log.component.ts header comment).
    // Fire-and-forget: a logging failure shouldn't block viewing the job itself.
    if (this.projectId) {
      const userEmail = this.authService.getLoggedInUserEmail() ?? 'Unknown User';
      this.jobAccessLogService.logAccess(String(this.projectId), userEmail).subscribe();
    }
  }

  switchTab(tab: TabKey): void {
    this.activeTab = tab;
  }
}
