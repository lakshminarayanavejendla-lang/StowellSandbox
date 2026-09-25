import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  AccumulationChartModule,
  AccumulationDataLabelService,
  AccumulationLegendService,
  AccumulationTooltipService,
  PieSeriesService,
} from '@syncfusion/ej2-angular-charts';
import { ProjectOverviewService } from '../../../../../core/services/project-overview.service';
import { CurrentCostSummaryViewModel } from '../../../../../core/models/project-management/cost-summary.model';

interface CashSlice {
  label: string;
  value: number;
}

// Port of Components/Pages/ProjectManagement/ReportingTab.razor + ReportingTabBase.cs.
// The RadzenProgressBarCircular is replicated with a plain percentage readout (a real circular
// progress widget is a small enough native-CSS job that it doesn't need a grid/chart library -
// left as a follow-up polish item rather than blocking this port). The RadzenChart pie
// (Cash Collected / Cash Paid / Net Cash) was originally ported with ng2-charts/Chart.js
// (matching Phase 1's free-stack decision); swapped here to Syncfusion's real
// `AccumulationChartComponent` (Pie series) now that a Syncfusion license is confirmed available -
// this one component was missed by the broader Phase 2/Dashboard grid-and-chart Syncfusion swap
// (that pass covered `pages/dashboard/` charts and `pages/project-management/` GRIDS, but not this
// tab's pie chart specifically), caught and fixed in this follow-up pass.
@Component({
  selector: 'app-reporting-tab',
  standalone: true,
  imports: [CommonModule, RouterLink, AccumulationChartModule],
  providers: [
    PieSeriesService,
    AccumulationLegendService,
    AccumulationTooltipService,
    AccumulationDataLabelService,
  ],
  templateUrl: './reporting-tab.component.html',
  styleUrl: './reporting-tab.component.scss',
})
export class ReportingTabComponent implements OnChanges {
  @Input({ required: true }) projectId!: number;

  constructor(
    private overviewService: ProjectOverviewService,
    private cdr: ChangeDetectorRef,
  ) {}

  model?: CurrentCostSummaryViewModel;
  percentage = 0;

  pieData: CashSlice[] = [];
  // Matches the previous Chart.js palette (Cash Collected/Cash Paid/Net Cash).
  pieColors = ['#2196f3', '#4caf50', '#ff9800'];
  legendSettings = { visible: true, position: 'Bottom' as const };
  tooltipEnabled = true;

  ngOnChanges(): void {
    if (!this.projectId) return;
    // See overview-tab.component.ts for why detectChanges() is needed here.
    this.overviewService.getCurrentCostSummaryViewModel(String(this.projectId)).subscribe((m) => {
      this.model = m;
      this.percentage = m.costCodeSummaryModel?.percentage ?? 0;

      const cash = m.cashFlowRecord;
      this.pieData = [
        { label: 'Cash Collected', value: cash?.cashCollected ?? 0 },
        { label: 'Cash Paid', value: cash?.cashPaid ?? 0 },
        { label: 'Net Cash', value: cash?.netCash ?? 0 },
      ];
      this.cdr.detectChanges();
    });
  }
}
