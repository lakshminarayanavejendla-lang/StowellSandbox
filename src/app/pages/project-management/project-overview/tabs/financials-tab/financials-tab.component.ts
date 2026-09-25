import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { CurrentCostSummaryViewModel } from '../../../../../core/models/project-management/cost-summary.model';

// Port of Components/Pages/ProjectManagement/FinancialsTab.razor + FinancialsTabBase.cs.
// Invoicing/Change Orders/Purchase Orders tables are static shells with no data binding in the
// Blazor source either (empty &nbsp; rows) - ported as-is rather than invented content.
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

  // BudgetPayment's Budget/Paid/Balance fields are strings on the wire (see CashFlowRecord
  // comment in cost-summary.model.ts) - parsed the same defensive way the Blazor markup does.
  asCurrency(value: string | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
