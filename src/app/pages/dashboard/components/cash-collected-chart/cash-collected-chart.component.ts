import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import {
  CategoryService,
  ChartModule,
  ColumnSeriesService,
  DataLabelService,
  LegendService,
  TooltipService,
} from '@syncfusion/ej2-angular-charts';
import { CHART_AREA, CHART_COLORS, DATA_LABEL, LEGEND, ROUNDED_TOP, TOOLTIP, categoryAxis, moneyAxis, onAxisLabel, onDataLabel, onTooltip, useChartTheme } from '../../../../shared/charts/chart-style';
import { JobService } from '../../../../core/services/job.service';
import { ChartData, CashDataItem } from '../../../../core/models/chart-data.model';

// Cash Collected vs Cash Paid, from ColumnChart1.razor: two column series side by side on one job
// axis. Dashboard.razor actually used the simpler ColumnChart.razor, which looks the same. Both were
// in the Blazor app; check which one was meant to ship.
//
// Syncfusion chart features (series types, categories, legend, tooltip, labels) only work when
// their services are in `providers`; the template alone isn't enough.
@Component({
  selector: 'app-cash-collected-chart',
  standalone: true,
  imports: [ChartModule],
  providers: [ColumnSeriesService, CategoryService, LegendService, TooltipService, DataLabelService],
  templateUrl: './cash-collected-chart.component.html',
})
export class CashCollectedChartComponent implements OnInit {
  private jobService = inject(JobService);

  chartData: CashDataItem[] = [];
  readonly chartTheme = useChartTheme();
  readonly colors = CHART_COLORS;
  readonly chartArea = CHART_AREA;
  readonly legendSettings = LEGEND;
  readonly tooltip = TOOLTIP;
  readonly rounded = ROUNDED_TOP;
  readonly marker = { dataLabel: DATA_LABEL('Outer') };
  readonly primaryXAxis = categoryAxis();
  readonly primaryYAxis = moneyAxis({ minimum: 0 });
  readonly onAxisLabel = onAxisLabel;
  readonly onTooltip = onTooltip;
  readonly onDataLabel = onDataLabel;

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
