import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { PoQueueService } from '../../../core/services/po-queue.service';
import { PoQueueRecord } from '../../../core/models/project-management/po-queue.model';
import { PoRequestService } from '../../../core/services/po-request.service';
import { PoDraftSummary } from '../../../core/models/project-management/po-draft.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

/**
 * NEW page - Stowell PO Module (not a Blazor port; built from the "Stowell PO Module" Moqups
 * design spec, page NAV-PO Queue Home). Mirrors bid-queue.component.ts's established pattern for
 * this app (two independent ejs-grids, Syncfusion Page/Sort/Filter services, manual
 * ChangeDetectorRef.detectChanges() after the HTTP subscribe - see overview-tab.component.ts for
 * why that's needed in this app).
 *
 * The three checkboxes (Show Completed/Cancelled/On-Hold POs) are shown in the mockup with no
 * spec'd exact semantics - implemented as the most natural reading: Cancelled/On-Hold filter rows
 * OUT of the active queue below when unchecked, and Show Completed POs toggles the whole second
 * "Completed Purchase Order Queue" grid's visibility.
 *
 * UPDATE: "Master Job PO ID" is now a link to /project-management/edit-po-form/:poId (see
 * NewPoFormComponent's isEditMode) using masterJobPoId itself as the id - the real Sage-backed
 * queue data (GetPoQueueData is confirmed live, see po-queue.service.ts) returns real PO record
 * identifiers here, not the speculative "(n of m)" composite the model comment describes. The
 * edit form's GetPoById/UpdatePo calls are themselves unconfirmed against the backend - see
 * po-request.service.ts's header comments on those two methods.
 */
@Component({
  selector: 'app-po-queue',
  standalone: true,
  imports: [GridModule, PageHeaderComponent, RouterLink],
  providers: [PageService, SortService, FilterService],
  templateUrl: './po-queue.component.html',
  styleUrl: './po-queue.component.scss',
})
export class PoQueueComponent implements OnInit {
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
