import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GridModule, PageService, SortService, FilterService } from '@syncfusion/ej2-angular-grids';
import { ProjectBudgetService } from '../../../core/services/project-budget.service';
import { ProjectBudgetQueueItem } from '../../../core/models/project-management/project-budget.model';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { AuthService } from '../../../core/services/auth.service';

// Port of Components/Pages/ProjectManagement/ProjectBudgetConfiguration.razor +
// ProjectBudgetConfigurationBase.cs (@page "/ProjectBudgetConfiguration"). Matches the stub
// route 'project-budget-configuration'. Each row links to either CreateBudget or ModifyBudget
// depending on Source=="Sage" (see source's `@if(Job.Source=="Sage")` branch), both handled by
// the same CreateBudgetComponent (project-management/create-budget) via its `:action` param.
// Plain table swapped for a Syncfusion ejs-grid - see HANDOFF.md's Syncfusion decision note.
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
