import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { JobSummaryService } from '../../../core/services/job-summary.service';
import { CostCodeSummaryRecord } from '../../../core/models/project-management/cost-summary.model';

// Port of Components/Pages/ProjectManagement/JobSummary.razor (@page "/JobSummary/{ProjectId:int}").
//
// FLAG - route addition: not one of the five original stub routes; added as
// 'project-management/job-summary/:projectId'. Please splice into app.routes.ts.
// FLAG - exports: same PDF/Excel-needs-a-new-library gap as the other two reports.
@Component({
  selector: 'app-job-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './job-summary.component.html',
  styleUrl: './job-summary.component.scss',
})
export class JobSummaryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private jobSummaryService = inject(JobSummaryService);

  projectId = 0;
  jobs: CostCodeSummaryRecord[] = [];
  filteredJobs: CostCodeSummaryRecord[] = [];
  searchTerm = '';
  pageSettings = { pageSize: 15, pageSizes: [10, 15, 20, 50] };

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId')) || 0;
    this.jobSummaryService.getJobCostSummaryRecords(String(this.projectId)).subscribe((rows) => {
      this.jobs = rows;
      this.filteredJobs = rows;
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    const t = term.trim().toLowerCase();
    this.filteredJobs = !t
      ? this.jobs
      : this.jobs.filter((j) => [j.jobNumber, j.costCode, j.costCodeDescription].some((f) => f?.toLowerCase().includes(t)));
  }

  copyToClipboard(): void {
    const header = 'Job Number\tCost Code\tCost Code Description\tBudget & Changes\tTo Date\tThis Period\tRemaining';
    const rows = this.filteredJobs.map((r) =>
      [r.jobNumber, r.costCode, r.costCodeDescription, r.budgetAndChanges, r.toDate, r.thisPeriod, r.remaining].join('\t')
    );
    navigator.clipboard?.writeText([header, ...rows].join('\n'));
  }

  exportCsv(): void {
    const header = 'JobNumber,CostCode,CostCodeDescription,BudgetAndChanges,ToDate,ThisPeriod,Remaining';
    const rows = this.filteredJobs.map(
      (r) => `"${r.jobNumber}","${r.costCode}","${r.costCodeDescription}",${r.budgetAndChanges},${r.toDate},${r.thisPeriod},${r.remaining}`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'JobSummary.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
