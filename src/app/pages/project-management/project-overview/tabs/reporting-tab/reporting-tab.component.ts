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

// The Reporting tab, from ReportingTab.razor. Radzen's circular progress bar is shown as a plain
// percentage for now; a CSS circle could be added later without any library. The Cash Collected /
// Cash Paid / Net Cash pie is a Syncfusion AccumulationChart (Pie series). It started on Chart.js and
// was missed when the other charts moved to Syncfusion.
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
  // The same colours as the old Chart.js pie (Cash Collected, Cash Paid, Net Cash).
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
