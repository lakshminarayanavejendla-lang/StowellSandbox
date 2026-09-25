import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import {
  CategoryService,
  ChartModule,
  ColumnSeriesService,
  LegendService,
  TooltipService,
} from '@syncfusion/ej2-angular-charts';
import { JobService } from '../../../../core/services/job.service';
import { ChartData, CashDataItem } from '../../../../core/models/chart-data.model';

// Port of ColumnChart1.razor (grouped Cash Collected vs Cash Paid bar chart), now rendered with
// Syncfusion's real `ejs-chart` (ChartComponent) instead of Chart.js/ng2-charts. Two `Column`
// type e-series sharing the same category axis - Syncfusion clusters (dodges) multiple Column
// series on a shared axis by default, matching the old grouped chart.js bar behavior; this
// hasn't been runtime-verified, flagging in case 27.1.48 needs an explicit clustering option.
// Dashboard.razor actually renders the plainer ColumnChart.razor variant (single "Cash Collected
// vs Cash Paid" RadzenColumnSeries pair built straight from ChartData, no CashDataItem
// transform) - this component reproduces that same visual result but through the CashDataItem
// shape. Confirm which of the two duplicate Blazor components was the one actually meant to
// ship; both were present in Components/ with no clear "dead code" marker.
//
// NOTE: ColumnSeriesService/CategoryService/LegendService/TooltipService must be registered in
// this component's `providers` array - Syncfusion Angular Chart features (series types, axis
// categories, legend, tooltip) are opt-in via Angular DI, not enabled just by template bindings.
@Component({
  selector: 'app-cash-collected-chart',
  standalone: true,
  imports: [ChartModule],
  providers: [ColumnSeriesService, CategoryService, LegendService, TooltipService],
  templateUrl: './cash-collected-chart.component.html',
})
export class CashCollectedChartComponent implements OnInit {
  private jobService = inject(JobService);

  chartData: CashDataItem[] = [];
  primaryXAxis = { valueType: 'Category' as const };
  primaryYAxis = { labelFormat: '{value}' };
  legendSettings = { visible: true };

  ngOnInit(): void {
    this.jobService.getCashCollectedDatasets().subscribe((datasets) => {
      this.chartData = this.toCashDataItems(datasets);
      this.cdr.detectChanges();
    });
  }

  private toCashDataItems(chartDataList: ChartData[]): CashDataItem[] {
    const chart = chartDataList[0];
    if (!chart) return [];

    return chart.labels.map((label, i) => {
      let cashCollected = 0;
      let cashPaid = 0;
      for (const dataset of chart.datasets) {
        if (dataset.label === 'Cash Collected') cashCollected = dataset.data[i] ?? 0;
        if (dataset.label === 'Cash Paid') cashPaid = dataset.data[i] ?? 0;
      }
      const category = label.length > 15 ? `${label.slice(0, 15)}...` : label;
      return { category, cashCollected, cashPaid };
    });
  }
  constructor(
  private cdr: ChangeDetectorRef,
  ) {}
}
