import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { PoQueueService } from '../../../core/services/po-queue.service';
import { PoRequestService } from '../../../core/services/po-request.service';
import { PoQueueRecord } from '../../../core/models/project-management/po-queue.model';
import { PendingPoApproval } from '../../../core/models/project-management/po-request.model';
import { ChangeRequestsPanelComponent } from '../../../shared/change-requests-panel/change-requests-panel.component';
import { KpiCardsComponent, KpiItem } from '../../../shared/ui/kpi-cards/kpi-cards.component';

/**
 * Accounting > PO Queue (Mike Smith, 2026-09-26).
 *
 * "Waiting for approval" lists the POs Project Managers submitted. Opening one shows Approve and
 * Reject. Approve creates the PO in Sage; Reject marks it rejected with a reason and removes it from
 * the list (see db/po-approval-2026-09-26.sql and PoQueueController). Below are the POs already in
 * Sage, active and completed, using the same data as the Project Management PO Queue.
 */
@Component({
  selector: 'app-accounting-po-queue',
  standalone: true,
  imports: [KpiCardsComponent, GridModule, PageHeaderComponent, RouterLink, ChangeRequestsPanelComponent],
  providers: [PageService, SortService, FilterService],
  templateUrl: './po-queue.component.html',
  styleUrl: './po-queue.component.scss',
})
export class PoQueueComponent implements OnInit {
  /** The summary cards under the page header. */
  get kpis(): KpiItem[] {
    return [
      { label: 'Waiting for approval', value: this.pending.length, hint: 'submitted by project managers', tone: this.pending.length ? 'warn' : 'default' },
      { label: 'Active POs', value: this.activePOs.length },
      { label: 'Completed POs', value: this.completedPOs.length, tone: 'good' },
    ];
  }

  private poQueueService = inject(PoQueueService);
  private poRequestService = inject(PoRequestService);
  private cdr = inject(ChangeDetectorRef);

  pending: PendingPoApproval[] = [];
  activePOs: PoQueueRecord[] = [];
  completedPOs: PoQueueRecord[] = [];
  loaded = false;
  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.poRequestService.getPendingApprovals().subscribe((rows) => {
      this.pending = rows;
      this.cdr.detectChanges();
    });

    this.poQueueService.getPoQueueData().subscribe((data) => {
      this.activePOs = data.activePOs ?? [];
      this.completedPOs = data.completedPOs ?? [];
      this.loaded = true;
      this.cdr.detectChanges();
    });
  }

  /** The approval screen for a waiting PO. */
  approvalLink(row: PendingPoApproval): (string | number)[] {
    return ['/project-management/po-request-approval', row.requestId];
  }
}
