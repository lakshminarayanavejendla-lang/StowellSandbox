import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { CoRequestService } from '../../../core/services/co-request.service';
import { PendingCoApproval } from '../../../core/models/project-management/co-request.model';
import { ChangeRequestsPanelComponent } from '../../../shared/change-requests-panel/change-requests-panel.component';
import { KpiCardsComponent, KpiItem } from '../../../shared/ui/kpi-cards/kpi-cards.component';

/**
 * Accounting > CO Queue (Mike Smith, 2026-09-26): the change orders Project Managers submitted that
 * Accounting hasn't decided yet. Opening one shows Approve and Reject. Approve creates the CO in Sage;
 * Reject marks it rejected with a reason and removes it from the list (see
 * db/co-approval-2026-09-26.sql and CoQueueController).
 */
@Component({
  selector: 'app-accounting-co-queue',
  standalone: true,
  imports: [KpiCardsComponent, GridModule, PageHeaderComponent, RouterLink, ChangeRequestsPanelComponent],
  providers: [PageService, SortService, FilterService],
  templateUrl: './co-queue.component.html',
})
export class AccountingCoQueueComponent implements OnInit {
  /** The summary cards under the page header. */
  get kpis(): KpiItem[] {
    return [
      { label: 'Waiting for approval', value: this.pending.length, hint: 'change orders submitted', tone: this.pending.length ? 'warn' : 'default' },
    ];
  }

  private coRequestService = inject(CoRequestService);
  private cdr = inject(ChangeDetectorRef);

  pending: PendingCoApproval[] = [];
  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.coRequestService.getPendingApprovals().subscribe((rows) => {
      this.pending = rows;
      this.cdr.detectChanges();
    });
  }

  /** The approval screen for a waiting CO. */
  approvalLink(row: PendingCoApproval): (string | number)[] {
    return ['/project-management/co-request-approval', row.requestId];
  }
}
