import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { GridModule } from '@syncfusion/ej2-angular-grids';

// Accounting > Invoice Queue (Mike Smith, 2026-09-26). A placeholder, since invoice approval isn't
// built yet. It's here so the Accounting menu is complete; rows will show once approval exists.
@Component({
  selector: 'app-accounting-invoice-queue',
  standalone: true,
  imports: [GridModule, PageHeaderComponent],
  templateUrl: './invoice-queue.component.html',
})
export class AccountingInvoiceQueueComponent {
  readonly emptyQueue: unknown[] = [];
}
