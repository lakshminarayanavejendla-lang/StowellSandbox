import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/**
 * Port of Components/Pages/ReportingDashboard/Index.razor (@page "/ReportingDashboard").
 * This is the NavMenu "Reports" link target - wired to the 'reporting-dashboard' route that
 * was a PlaceholderComponent stub through Phase 1/2.
 *
 * Two link targets from the source were NOT built as new components in this module, because
 * they're already real pages ported by the Project Management phase (Phase 2) under a
 * different module folder - reused via routerLink instead of duplicating:
 *  - "Cash Flow Report" (source href `/CashFlowReport/0`) -> project-management's
 *    CashFlowReportComponent at 'project-management/cash-flow-report/:projectId'. The Blazor
 *    source hardcodes projectId 0 (no project selected yet); reproduced the same way here.
 *  - The default (non-JS-overridden) "Job Cost Summary Reports" link (source href
 *    `/CostCodeSummaryReport`) IS its own new component in this module (see
 *    CostCodeSummaryReportComponent) since that's a real, separate route/page from Project
 *    Management's `/CostCodeSummary/{ProjectId}` one - but the source page also carries inline
 *    JS that, if a `defaultJobId` is present in localStorage, opens
 *    `/CostCodeSummary/{defaultJobId}` instead (Project Management's per-job report) in a new
 *    tab. Reproduced that same conditional below via `openCostCodeSummary()`, minus the
 *    "open in a new tab" part (kept as normal in-app navigation - no source evidence a new tab
 *    is actually required here vs. just being how the rest of this Blazor page's links behave).
 *
 * "Job Cost Journal" and "Budget Report" (Power BI) links in the source are commented out /
 * hidden (`class="hide"`) in the Blazor markup - not ported, since there's nothing live to port.
 */
@Component({
  selector: 'app-reporting-dashboard-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reporting-dashboard-home.component.html',
  styleUrl: './reporting-dashboard-home.component.scss',
})
export class ReportingDashboardHomeComponent {
  constructor(private router: Router) {}

  openCostCodeSummary(): void {
    const defaultJobId = localStorage.getItem('defaultJobId');
    if (defaultJobId) {
      this.router.navigate(['/project-management/cost-code-summary', defaultJobId]);
    } else {
      this.router.navigate(['/reporting-dashboard/cost-code-summary-report']);
    }
  }
}
