import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, BidItem } from '../../../core/models/project-management/cost-code.model';

// Port of Components/Pages/ProjectManagement/ProjectQueue.razor + ProjectQueueBase.cs
// (@page "/ProjectQueue"). Two RadzenDataGrids (Active Projects / CostCodeRecord, Pending
// Projects / BidItem) are now real Syncfusion ejs-grid components (Community license
// confirmed) instead of the earlier plain-table stand-in - see HANDOFF.md.
@Component({
  selector: 'app-project-queue',
  standalone: true,
  imports: [RouterLink, FormsModule, GridModule, DatePipe],
  // PageService/SortService/FilterService must be provided for [allowPaging]/[allowSorting]/
  // [allowFiltering] to actually work - EJ2 Angular grids inject these features via DI rather
  // than picking them up from the module import alone.
  providers: [PageService, SortService, FilterService],
  templateUrl: './project-queue.component.html',
  styleUrl: './project-queue.component.scss',
})
export class ProjectQueueComponent implements OnInit {
  private costCodeService = inject(ProjectCostCodeService);
 constructor(
  private cdr: ChangeDetectorRef,
  ) {}
  costCodes: CostCodeRecord[] = [];
  filteredCostCodes: CostCodeRecord[] = [];
  searchTerm = '';

  bids: BidItem[] = [];
  filteredBids: BidItem[] = [];

  // Shared page-size config for both grids - Grid's own footer pager/page-size dropdown
  // replaces the free-table version's manual "Show N entries" control.
  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.costCodeService.getCostCodeRecords().subscribe((rows) => {
      this.costCodes = rows;
      this.applyFilter();
      this.cdr.detectChanges(); // Ensure the view updates after data is loaded
    });
    this.costCodeService.getBids().subscribe((rows) => {
      this.bids = rows;
      this.filteredBids = rows;
      this.cdr.detectChanges(); // Ensure the view updates after data is loaded
    });
    
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredCostCodes = !term
      ? this.costCodes
      : this.costCodes.filter((c) =>
          [String(c.recNum), c.jobNumber, c.address, c.city, c.state, c.zipCode].some((f) =>
            f?.toLowerCase().includes(term)
          )
        );
  }
  
}
