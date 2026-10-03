import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { PoQueueService } from '../../../core/services/po-queue.service';
import { PoQueueRecord } from '../../../core/models/project-management/po-queue.model';
import { PoRequestService } from '../../../core/services/po-request.service';
import { PoDraftSummary } from '../../../core/models/project-management/po-draft.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { KpiCardsComponent, KpiItem } from '../../../shared/ui/kpi-cards/kpi-cards.component';

/**
 * The PO Queue, built from the Moqups design (page NAV-PO Queue Home), not ported from Blazor. It
 * works like bid-queue.component.ts: two Syncfusion grids with paging, sorting and filtering, and
 * detectChanges() after each request (see overview-tab.component.ts for why).
 *
 * The mockup's three checkboxes (Show Completed, Cancelled and On-Hold POs) have no written rules,
 * so they do the obvious thing: unchecking Cancelled or On-Hold hides those rows from the active
 * queue, and Show Completed POs shows or hides the Completed Purchase Order Queue grid.
 *
 * "Master Job PO ID" links to /project-management/edit-po-form/:poId (see isEditMode in
 * NewPoFormComponent). The queue data from Sage has real PO ids here, not the "(n of m)" value the
 * model describes.
 */
@Component({
  selector: 'app-po-queue',
  standalone: true,
  imports: [KpiCardsComponent, GridModule, PageHeaderComponent, RouterLink],
  providers: [PageService, SortService, FilterService],
  templateUrl: './po-queue.component.html',
  styleUrl: './po-queue.component.scss',
})
export class PoQueueComponent implements OnInit {
  /** The summary cards under the page header. */
  get kpis(): KpiItem[] {
    return [
      { label: 'Active POs', value: this.allActivePOs.length, hint: 'in progress' },
      { label: 'Completed POs', value: this.completedPOs.length, tone: 'good' },
      { label: 'Draft POs', value: this.drafts.length, hint: this.drafts.length ? 'not yet submitted' : 'none waiting', tone: this.drafts.length ? 'warn' : 'default' },
    ];
  }

  private poQueueService = inject(PoQueueService);
  private poRequestService = inject(PoRequestService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loaded = false;

  allActivePOs: PoQueueRecord[] = [];
  completedPOs: PoQueueRecord[] = [];
  filteredActivePOs: PoQueueRecord[] = [];
  drafts: PoDraftSummary[] = [];

  showCompleted = true;
  showCancelled = true;
  showOnHold = true;

  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.poQueueService.getPoQueueData().subscribe((data) => {
      this.allActivePOs = data.activePOs ?? [];
      this.completedPOs = data.completedPOs ?? [];
      this.applyFilter();
      this.loaded = true;
      this.cdr.detectChanges();
    });

    this.loadDrafts();
  }

  private loadDrafts(): void {
    this.poRequestService.getDrafts().subscribe((drafts) => {
      this.drafts = drafts;
      this.cdr.detectChanges();
    });
  }

  resumeDraft(draft: PoDraftSummary): void {
    this.router.navigate(['/project-management/new-po-form'], { queryParams: { draftId: draft.draftId } });
  }

  deleteDraft(draft: PoDraftSummary): void {
    this.poRequestService.deleteDraft(draft.draftId).subscribe((deleted) => {
      if (deleted) this.loadDrafts();
    });
  }

  onToggleCompleted(checked: boolean): void {
    this.showCompleted = checked;
  }

  onToggleCancelled(checked: boolean): void {
    this.showCancelled = checked;
    this.applyFilter();
  }

  onToggleOnHold(checked: boolean): void {
    this.showOnHold = checked;
    this.applyFilter();
  }

  private applyFilter(): void {
    this.filteredActivePOs = this.allActivePOs.filter((po) => {
      const status = po.poStatus?.toLowerCase() ?? '';
      if (!this.showCancelled && status === 'cancelled') return false;
      if (!this.showOnHold && status === 'on-hold') return false;
      return true;
    });
  }
}
