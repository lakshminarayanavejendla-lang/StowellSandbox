import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import {
  BarSeriesService,
  CategoryService,
  ChartModule,
  DataLabelService,
  TooltipService,
} from '@syncfusion/ej2-angular-charts';
import { CHART_AREA, CHART_COLORS, DATA_LABEL, ROUNDED_END, TOOLTIP, categoryAxis, moneyAxis, onAxisLabel, onDataLabel, onTooltip, useChartTheme } from '../../../../shared/charts/chart-style';
import { JobService } from '../../../../core/services/job.service';

interface NetCashPoint {
  category: string;
  value: number;
}

// Net Cash Out, from StackedBarChart.razor. Despite that name it's one series, not stacked, so this
// is a single set of horizontal bars ranked by size.
@Component({
  selector: 'app-net-cash-chart',
  standalone: true,
  imports: [ChartModule],
  providers: [BarSeriesService, CategoryService, TooltipService, DataLabelService],
  templateUrl: './net-cash-chart.component.html',
})
export class NetCashChartComponent implements OnInit {
  private jobService = inject(JobService);

  chartData: NetCashPoint[] = [];
  readonly chartTheme = useChartTheme();
  readonly colors = CHART_COLORS;
  readonly chartArea = CHART_AREA;
  readonly tooltip = TOOLTIP;
  readonly rounded = ROUNDED_END;
  readonly marker = { dataLabel: DATA_LABEL('Outer') };
  /** ranked horizontal bars: the biggest job is at the top */
  readonly primaryXAxis = categoryAxis({ isInversed: true });
  readonly primaryYAxis = moneyAxis({ minimum: 0 });
  readonly onAxisLabel = onAxisLabel;
  readonly onTooltip = onTooltip;
  readonly onDataLabel = onDataLabel;

  ngOnInit(): void {
    this.jobService.getNetCashChart().subscribe((datasets) => {
      const chart = datasets[0];
      if (!chart) return;
      const dataset = chart.datasets[0];
      const values = dataset?.data ?? [];
      this.chartData = chart.labels.map((label, i) => ({ category: label, value: values[i] ?? 0 })).sort((a, b) => b.value - a.value);
      this.cdr.detectChanges();
    });
  }
   constructor(
    private cdr: ChangeDetectorRef,
    ) {}
}
