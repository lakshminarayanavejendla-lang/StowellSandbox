import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { CoQueueService } from '../../../core/services/co-queue.service';
import { CoQueueRecord } from '../../../core/models/project-management/co-queue.model';
import { CoRequestService } from '../../../core/services/co-request.service';
import { CoDraftSummary } from '../../../core/models/project-management/po-draft.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { KpiCardsComponent, KpiItem } from '../../../shared/ui/kpi-cards/kpi-cards.component';

/**
 * The CO Queue, built from the Moqups design (page NAV-CO Queue Home), not ported from Blazor. It
 * works like po-queue.component.ts (see its header for the checkboxes, the detectChanges() calls and
 * the "Master Job CO ID" link to edit-co-form).
 */
@Component({
  selector: 'app-co-queue',
  standalone: true,
  imports: [PageHeaderComponent, KpiCardsComponent, GridModule, RouterLink],
  providers: [PageService, SortService, FilterService],
  templateUrl: './co-queue.component.html',
  styleUrl: './co-queue.component.scss',
})
export class CoQueueComponent implements OnInit {
  private coQueueService = inject(CoQueueService);
  private coRequestService = inject(CoRequestService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loaded = false;

  get kpis(): KpiItem[] {
    return [
      { label: 'Active change orders', value: this.allActiveCOs.length },
      { label: 'Completed', value: this.completedCOs.length, tone: 'good' },
      { label: 'Drafts', value: this.drafts.length },
    ];
  }

  allActiveCOs: CoQueueRecord[] = [];
  completedCOs: CoQueueRecord[] = [];
  filteredActiveCOs: CoQueueRecord[] = [];
  drafts: CoDraftSummary[] = [];

  showCompleted = true;
  showCancelled = true;
  showOnHold = true;

  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.coQueueService.getCoQueueData().subscribe((data) => {
      this.allActiveCOs = data.activeCOs ?? [];
      this.completedCOs = data.completedCOs ?? [];
      this.applyFilter();
      this.loaded = true;
      this.cdr.detectChanges();
    });

    this.loadDrafts();
  }

  private loadDrafts(): void {
    this.coRequestService.getDrafts().subscribe((drafts) => {
      this.drafts = drafts;
      this.cdr.detectChanges();
    });
  }

  resumeDraft(draft: CoDraftSummary): void {
    this.router.navigate(['/project-management/new-co-form'], { queryParams: { draftId: draft.draftId } });
  }

  deleteDraft(draft: CoDraftSummary): void {
    this.coRequestService.deleteDraft(draft.draftId).subscribe((deleted) => {
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

  /** The link for a "Master Job CO ID" cell. A CO Budget Allocation (allocationId set, see
   * CoQueueRecord) opens the CO Budget Allocation page; anything else opens edit-co-form. It's one
   * method returning the link, not an @if/@else with two <a> tags, because the grid's column template
   * renders outside Angular's normal change detection, and a block inside it left the grid stuck. */
  coLink(record: CoQueueRecord): unknown[] {
    return record.allocationId != null
      ? ['/project-management/co-budget-allocation', record.allocationId]
      : ['/project-management/edit-co-form', record.masterJobCoId];
  }

  private applyFilter(): void {
    this.filteredActiveCOs = this.allActiveCOs.filter((co) => {
      const status = co.poStatus?.toLowerCase() ?? '';
      if (!this.showCancelled && status === 'cancelled') return false;
      if (!this.showOnHold && status === 'on-hold') return false;
      return true;
    });
  }

}
