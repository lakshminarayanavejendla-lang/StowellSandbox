import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { AccountingService } from '../../../core/services/accounting.service';
import { AccountingItem, resolveAccountingQueueAction } from '../../../core/models/accounting/accounting-item.model';

// Port of Accounting/Index.razor + IndexBase.cs ("Active Projects" queue). Radzen's paid
// RadzenDataGrid is now a real Syncfusion ejs-grid (Community license) - search stays a
// component-driven text box; paging/sorting/filtering use Grid's own built-in features.
@Component({
  selector: 'app-accounting-queue',
  standalone: true,
  imports: [RouterLink, GridModule],
  providers: [PageService, SortService, FilterService],
  templateUrl: './accounting-queue.component.html',
  styleUrl: './accounting-queue.component.scss',
})
export class AccountingQueueComponent implements OnInit {
  private accountingService = inject(AccountingService);

  items: AccountingItem[] = [];
  filteredItems: AccountingItem[] = [];
  searchTerm = '';
  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };
  isLoading = true;

  ngOnInit(): void {
    this.isLoading = true;
    this.accountingService.getRecords().subscribe((items) => {
      this.items = items;
      this.applyFilter();
      this.isLoading = false;
this.cdr.detectChanges();
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  // Route target for a queue row's Job ID link - see Index.razor's inline StatusID switch.
  queueLink(item: AccountingItem): string[] {
    const action = resolveAccountingQueueAction(item.statusID);
    return ['/accounting', action, item.jobID];
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredItems = !term
      ? this.items
      : this.items.filter((j) =>
          [j.jobID, j.jobName, j.address, j.submitter, j.jobType].some((f) => f?.toLowerCase().includes(term))
        );
  }
  constructor(private cdr: ChangeDetectorRef) { }
}
