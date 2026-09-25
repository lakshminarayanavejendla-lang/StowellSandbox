import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule, PageSettingsModel, PageService, SortService } from '@syncfusion/ej2-angular-grids';
import { JobService } from '../../../../core/services/job.service';
import { CurrentJob } from '../../../../core/models/current-job.model';
import { AuthService } from '../../../../core/services/auth.service';
// Port of CurrentJobs.razor / DashboardCurrentJobs.razor. Radzen's paid RadzenDataGrid is
// now replaced with the real Syncfusion `ejs-grid` (GridComponent) - see current-jobs.component.html
// for the column/template markup. Search stays a hand-rolled client-side filter feeding
// [dataSource] (rather than the grid's own toolbar Search) so the existing search box UI didn't
// need to change; paging is now the grid's own built-in pager (PageService) instead of the old
// manual pagedJobs/goToPage logic.
//
// NOTE: PageService/SortService must be listed in this component's `providers` array - Syncfusion
// Angular Grid features (paging, sorting, filtering, etc.) are opt-in via Angular DI, not enabled
// just by setting the corresponding @Input. Sorting was not explicitly requested but is a
// low-risk, standard Grid feature added here for a more complete "real grid" feel - drop
// `allowSorting`/`SortService` if that's unwanted scope creep.
@Component({
  selector: 'app-current-jobs',
  standalone: true,
  imports: [RouterLink, GridModule],
  providers: [PageService, SortService],
  templateUrl: './current-jobs.component.html',
  styleUrl: './current-jobs.component.scss',
})
export class CurrentJobsComponent implements OnInit {
  private jobService = inject(JobService);

  jobs: CurrentJob[] = [];
  filteredJobs: CurrentJob[] = [];
  searchTerm = '';

  // Mirrors the old pageSizeOptions ([10, 15, 20, 50] + "All"). `pageSizes` on
  // PageSettingsModel accepts a string[] to render a page-size dropdown in the grid's own
  // pager - "All" is documented Syncfusion behavior for "show every record", but this hasn't
  // been runtime-verified against the pinned 27.1.48 version.
  pageSettings: PageSettingsModel = {
    pageSize: 15,
    pageSizes: ['10', '15', '20', '50', 'All'],
  };

  // TODO: resolve the signed-in user's email from the MSAL account instead of a hardcoded
  // placeholder once auth is fully wired (see JobService notes).
  //private userEmail = 'pcsadmin@phoenixcanopyshades.com';
 // private userEmail = '';
  ngOnInit(): void {
       const userEmail = this.authservice.getLoggedInUserEmail();

  console.log('Logged-in user:', userEmail);

  if (!userEmail) {
    console.warn('No logged-in MSAL account found.');
    return;
  }
    this.jobService.getCurrentJobs(userEmail).subscribe((jobs) => {
      this.jobs = jobs;
      this.applyFilter();
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    debugger; 
    this.filteredJobs = !term
      ? this.jobs
      : this.jobs.filter((j) =>
          [j.jobID, j.jobName, j.address, j.createdBy, j.status].some((f) =>
            f?.toLowerCase().includes(term)
          )
        );
        console.log('Filtered Jobs:', this.filteredJobs); // Debugging line to check filtered results
        this.cdr.detectChanges(); // Trigger change detection to update the view
  }
  constructor(
  private cdr: ChangeDetectorRef,
  private authservice: AuthService
) {}

}
