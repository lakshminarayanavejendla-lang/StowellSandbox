import { Component } from '@angular/core';
import { GridModule } from '@syncfusion/ej2-angular-grids';

/**
 * Port of Accounting/POQueue.razor.
 *
 * FLAG: the source .razor file has NO @code block, no @inherits, and no @inject - it's pure
 * static markup with two hardcoded, entirely empty DataTables-style tables ("Purchase Order
 * Queue" and "Completed Purchase Order Queue"), each with one row of "&nbsp;" placeholder
 * cells. There is no PO-queue service, model, or controller anywhere in the Blazor source this
 * page talks to. This looks like a work-in-progress/dead stub rather than a finished feature -
 * unlike Index.razor (wired to IAccountingService) or the budget approval pages, this one was
 * apparently never connected to real data.
 *
 * The two static tables are now Syncfusion ejs-grid components bound to an empty array ([])
 * with the same column headers, since this task calls for swapping plain-table grids for real
 * Syncfusion grids across the board - still not backed by any service call, so this remains a
 * structural placeholder, not a working feature. Flag to the product owner: confirm whether a
 * real PO queue feature should be built here (and what its backing API/table actually is), or
 * whether this route should be dropped entirely.
 */
@Component({
  selector: 'app-po-queue',
  standalone: true,
  imports: [GridModule],
  templateUrl: './po-queue.component.html',
  styleUrl: './po-queue.component.scss',
})
export class PoQueueComponent {
  // Both grids are unwired (see class-level FLAG) - typed as any[] since there is no real
  // PO record model in the source to model this against.
  readonly emptyPoQueue: unknown[] = [];
}
