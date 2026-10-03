import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { CurrentCostSummaryViewModel } from '../../../../../core/models/project-management/cost-summary.model';

// The Financials tab, from FinancialsTab.razor. The Invoicing, Change Orders and Purchase Orders
// tables are empty shells in Blazor too, so they're kept empty here.
@Component({
  selector: 'app-financials-tab',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './financials-tab.component.html',
  styleUrl: './financials-tab.component.scss',
})
export class FinancialsTabComponent implements OnChanges {
  @Input({ required: true }) projectId!: number;

  constructor(
    private overviewService: ProjectOverviewService,
    private cdr: ChangeDetectorRef,
  ) {}

  model?: CurrentCostSummaryViewModel;

  ngOnChanges(): void {
    if (!this.projectId) return;
    // See overview-tab.component.ts for why detectChanges() is needed here.
    this.overviewService.getCurrentCostSummaryViewModel(String(this.projectId)).subscribe((m) => {
      this.model = m;
      this.cdr.detectChanges();
    });
  }

  // Budget, Paid and Balance come as strings (see cost-summary.model.ts), so they're parsed carefully,
  // as the Blazor page did.
  asCurrency(value: string | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
