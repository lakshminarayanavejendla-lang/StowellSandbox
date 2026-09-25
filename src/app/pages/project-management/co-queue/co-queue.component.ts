import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { CoQueueService } from '../../../core/services/co-queue.service';
import { CoQueueRecord } from '../../../core/models/project-management/co-queue.model';
import { CoRequestService } from '../../../core/services/co-request.service';
import { CoDraftSummary } from '../../../core/models/project-management/po-draft.model';

/**
 * NEW page - Stowell PO Module (not a Blazor port; built from the "Stowell PO Module" Moqups
 * design spec, page NAV-CO Queue Home). Mirrors po-queue.component.ts exactly - see that file's
 * header comment for the shared design rationale (checkbox semantics, ChangeDetectorRef fix,
 * "Master Job CO ID" -> edit-co-form link).
 */
@Component({
  selector: 'app-co-queue',
  standalone: true,
  imports: [GridModule, RouterLink],
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

  /** Single routerLink target for a "Master Job CO ID" cell - a CO Budget Allocation submission
   * (allocationId set, see CoQueueRecord's comment) edits on the CO Budget Allocation page;
   * everything else keeps going to the plain edit-co-form page. Kept as one method returning the
   * link array (rather than an @if/@else swapping between two <a> tags) since the ejs-grid column
   * ng-template renders per-row through Syncfusion's own view creation, not Angular's normal
   * change detection path - a structural block inside it left the grid stuck mid-render. */
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
