import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { ProjectBudgetService } from '../../../core/services/project-budget.service';
import { ProjectBudgetQueueItem } from '../../../core/models/project-management/project-budget.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { AuthService } from '../../../core/services/auth.service';

// Project Budget Configuration (/ProjectBudgetConfiguration in Blazor), a Syncfusion grid. Each row
// links to CreateBudget, or to ModifyBudget when Source is "Sage", both handled by CreateBudgetComponent
// through its `:action` parameter.
@Component({
  selector: 'app-project-budget-configuration',
  standalone: true,
  imports: [RouterLink, FormsModule, GridModule, PageHeaderComponent],
  providers: [PageService, SortService, FilterService],
  templateUrl: './project-budget-configuration.component.html',
  styleUrl: './project-budget-configuration.component.scss',
})
export class ProjectBudgetConfigurationComponent implements OnInit {
  private budgetService = inject(ProjectBudgetService);
  private cdr = inject(ChangeDetectorRef);
  items: ProjectBudgetQueueItem[] = [];
  filteredItems: ProjectBudgetQueueItem[] = [];
  searchTerm = '';
  pageSettings = { pageSize: 10, pageSizes: [10, 20, 50] };

  ngOnInit(): void {
    this.budgetService.getProjectBudgetRecords(this.authservice.getLoggedInUserEmail() || '').subscribe((rows) => {
      this.items = rows;
      this.applyFilter();
      this.cdr.detectChanges(); // Trigger change detection to update the view
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  linkFor(item: ProjectBudgetQueueItem): (string | number)[] {
    const action = item.source === 'Sage' ? 'ModifyBudget' : 'CreateBudget';
    return ['/project-budget-configuration', action, item.jobID];
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredItems = !term
      ? this.items
      : this.items.filter((j) =>
          [j.jobID, j.jobName, j.address, j.phase].some((f) => f?.toLowerCase().includes(term))
        );
  }
  constructor(

  private authservice: AuthService
) {}

}
