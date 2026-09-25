import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { JobAccessLogService } from '../../../core/services/job-access-log.service';
import { JobAccessLogRecord } from '../../../core/models/project-management/job-access-log.model';

// Job access audit trail (new feature, not a Blazor port, not on any Moqups page). Deliberately
// NOT linked from nav-menu.component.ts - reachable only by direct URL
// (/project-management/job-access-log), per the request that asked for this page "without
// navigation". Mirrors co-queue.component.ts's grid setup; see JobAccessController.cs / this
// module's job-access-log.service.ts for how rows get here (ProjectOverviewComponent.ngOnInit
// calls JobAccessLogService.logAccess on every job view).
@Component({
  selector: 'app-job-access-log',
  standalone: true,
  imports: [GridModule],
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
