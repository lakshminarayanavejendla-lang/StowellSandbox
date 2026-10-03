import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { AccountingService } from '../../../core/services/accounting.service';
import { PoRequestService } from '../../../core/services/po-request.service';
import { CoRequestService } from '../../../core/services/co-request.service';
import { CoBudgetAllocationService } from '../../../core/services/co-budget-allocation.service';
import { KpiCardsComponent, KpiItem } from '../../../shared/ui/kpi-cards/kpi-cards.component';
import {
  APPROVAL_TYPES,
  AccountingItem,
  ApprovalType,
  approvalTypeFor,
  resolveAccountingQueueAction,
} from '../../../core/models/accounting/accounting-item.model';

/** A queue row. `link` replaces the Job ID link for types with their own approval screen, such as Purchase Order. */
type QueueRow = AccountingItem & { approvalType: ApprovalType; link?: (string | number)[] };

// The Accounting Queue: everything waiting on Accounting, grouped by approval type (Mike Smith,
// 2026-09-26). The types are Initial Budget Creation, Purchase Order, Change Order, Invoice and
// Budget Allocation (Prime / Internal). It began as Accounting/Index.razor ("Active Projects"),
// and those rows are kept and given one of these types.
@Component({
  selector: 'app-accounting-queue',
  standalone: true,
  imports: [KpiCardsComponent, RouterLink, GridModule, PageHeaderComponent],
  providers: [PageService, SortService, FilterService],
  templateUrl: './accounting-queue.component.html',
  styleUrl: './accounting-queue.component.scss',
})
export class AccountingQueueComponent implements OnInit {
  /** The summary cards under the page header. */
  get kpis(): KpiItem[] {
    const count = (t: string) => this.items.filter((i) => i.approvalType === t).length;
    const shown = this.types.filter((t) => t.ready).slice(0, 3);
    return [
      { label: 'Items in the queue', value: this.items.length, hint: 'waiting on Accounting', tone: this.items.length ? 'warn' : 'default' },
      ...shown.map((t) => ({ label: String(t.type), value: count(String(t.type)) })),
    ];
  }

  private accountingService = inject(AccountingService);
  private poRequestService = inject(PoRequestService);
  private coRequestService = inject(CoRequestService);
  private allocationService = inject(CoBudgetAllocationService);

  items: QueueRow[] = [];
  private baseItems: QueueRow[] = [];
  private poItems: QueueRow[] = [];
  private coItems: QueueRow[] = [];
  private allocationItems: QueueRow[] = [];
  filteredItems: QueueRow[] = [];
  searchTerm = '';
  selectedType: ApprovalType | 'All' = 'All';
  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };
  isLoading = true;

  readonly types = APPROVAL_TYPES;

  ngOnInit(): void {
    this.isLoading = true;
    this.accountingService.getRecords().subscribe((items) => {
      // Rejected budgets (status 3) leave the queue (Mike Smith, 2026-09-26).
      this.baseItems = items.filter((i) => i.statusID !== '3').map((i) => ({ ...i, approvalType: approvalTypeFor(i.statusID) }));
      this.merge();
      this.isLoading = false;
      this.cdr.detectChanges();
    });

    // POs that Project Managers submitted and Accounting hasn't decided yet. Approve creates the PO in Sage; Reject drops it.
    this.poRequestService.getPendingApprovals().subscribe((rows) => {
      this.poItems = rows.map((r) => ({
        id: r.requestId,
        jobID: r.jobId,
        jobName: r.jobName,
        jobType: `PO #${r.requestId}`,
        bidDate: r.submittedDate,
        address: `${r.vendor} - ${r.poDescription}`,
        submitter: r.requester || r.createdBy,
        bidStatus: 'Pending Approval',
        statusID: 'PO',
        approvalType: 'Purchase Order' as ApprovalType,
        link: ['/project-management/po-request-approval', r.requestId],
      }));
      this.merge();
      this.cdr.detectChanges();
    });

    // Change orders that Project Managers submitted and Accounting hasn't decided yet.
    this.coRequestService.getPendingApprovals().subscribe((rows) => {
      this.coItems = rows.map((r) => ({
        id: r.requestId,
        jobID: r.jobId,
        jobName: r.jobName,
        jobType: `CO #${r.requestId}`,
        bidDate: r.submittedDate,
        address: r.coReason,
        submitter: r.requester || r.createdBy,
        bidStatus: 'Pending Approval',
        statusID: 'CO',
        approvalType: 'Change Order' as ApprovalType,
        link: ['/project-management/co-request-approval', r.requestId],
      }));
      this.merge();
      this.cdr.detectChanges();
    });

    // Budget allocations (Prime / Internal) that Project Managers submitted and Accounting hasn't decided yet.
    this.allocationService.getPendingApprovals().subscribe((rows) => {
      this.allocationItems = rows.map((r) => ({
        id: r.requestId,
        jobID: r.jobId,
        jobName: r.jobName,
        jobType: `Allocation #${r.requestId}`,
        bidDate: r.submittedDate,
        address: r.coDescription || r.coReason,
        submitter: r.createdBy,
        bidStatus: 'Pending Approval',
        statusID: 'ALLOC',
        approvalType: (r.coType === 'Prime' ? 'Budget Allocation - Prime' : 'Budget Allocation - Internal') as ApprovalType,
        link: ['/project-management/co-budget-allocation-approval', r.requestId],
      }));
      this.merge();
      this.cdr.detectChanges();
    });
  }

  private merge(): void {
    this.items = [...this.poItems, ...this.coItems, ...this.allocationItems, ...this.baseItems];
    this.applyFilter();
  }

  countFor(type: ApprovalType): number {
    return this.items.filter((i) => i.approvalType === type).length;
  }

  /** True when the selected type has no approval step yet, so nothing can be waiting in it. */
  get selectedTypeNotReady(): boolean {
    const t = this.types.find((x) => x.type === this.selectedType);
    return !!t && !t.ready;
  }

  selectType(type: ApprovalType | 'All'): void {
    this.selectedType = type;
    this.applyFilter();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  // Where a row's Job ID link goes, from the StatusID switch in Index.razor.
  queueLink(item: QueueRow): (string | number)[] {
    if (item.link) return item.link;
    const action = resolveAccountingQueueAction(item.statusID);
    return ['/accounting', action, item.jobID];
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredItems = this.items.filter(
      (j) =>
        (this.selectedType === 'All' || j.approvalType === this.selectedType) &&
        (!term || [j.jobID, j.jobName, j.address, j.submitter, j.jobType, j.approvalType].some((f) => f?.toLowerCase().includes(term)))
    );
  }

  constructor(private cdr: ChangeDetectorRef) {}
}
