import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { ProjectCostCodeService } from '../../../core/services/project-cost-code.service';
import { CostCodeRecord, BidItem } from '../../../core/models/project-management/cost-code.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { KpiCardsComponent, KpiItem } from '../../../shared/ui/kpi-cards/kpi-cards.component';

// The Project Queue (/ProjectQueue in Blazor). Its two grids, Active Projects (CostCodeRecord) and
// Pending Projects (BidItem), are Syncfusion ejs-grids.
@Component({
  selector: 'app-project-queue',
  standalone: true,
  imports: [PageHeaderComponent, KpiCardsComponent, RouterLink, FormsModule, GridModule, DatePipe],
  // Paging, sorting and filtering only work when PageService, SortService and FilterService are in
  // providers; importing the module isn't enough.
  providers: [PageService, SortService, FilterService],
  templateUrl: './project-queue.component.html',
  styleUrl: './project-queue.component.scss',
})
export class ProjectQueueComponent implements OnInit {
  private costCodeService = inject(ProjectCostCodeService);
 constructor(
  private cdr: ChangeDetectorRef,
  ) {}
  get kpis(): KpiItem[] {
    return [
      { label: 'Active projects', value: this.costCodes.length },
      { label: 'Pending projects', value: this.bids.length, tone: this.bids.length ? 'warn' : 'default' },
    ];
  }

  costCodes: CostCodeRecord[] = [];
  filteredCostCodes: CostCodeRecord[] = [];
  searchTerm = '';

  bids: BidItem[] = [];
  filteredBids: BidItem[] = [];

  // Page size for both grids, using the grid's own pager.
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
