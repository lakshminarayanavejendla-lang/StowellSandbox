import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { JobAccessLogService } from '../../../core/services/job-access-log.service';
import { JobAccessLogRecord } from '../../../core/models/project-management/job-access-log.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

// The job access audit trail, a new feature with no Blazor or Moqups page. It's not in the menu, as
// asked ("without navigation"); open it at /project-management/job-access-log or from the Stowell
// Admin tile. The grid is set up like co-queue.component.ts. Rows are added by
// ProjectOverviewComponent, which calls logAccess every time a job is viewed (see
// job-access-log.service.ts and JobAccessController.cs).
@Component({
  selector: 'app-job-access-log',
  standalone: true,
  imports: [PageHeaderComponent, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './job-access-log.component.html',
  styleUrl: './job-access-log.component.scss',
})
export class JobAccessLogComponent implements OnInit {
  private jobAccessLogService = inject(JobAccessLogService);
  private cdr = inject(ChangeDetectorRef);

  loaded = false;
  records: JobAccessLogRecord[] = [];
  pageSettings = { pageSize: 20, pageSizes: [20, 50, 100] };

  ngOnInit(): void {
    this.jobAccessLogService.getLog().subscribe((records) => {
      this.records = records;
      this.loaded = true;
      this.cdr.detectChanges();
    });
  }
}
