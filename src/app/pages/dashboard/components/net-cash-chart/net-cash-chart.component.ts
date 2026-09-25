import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import {
  CategoryService,
  ChartModule,
  ColumnSeriesService,
  TooltipService,
} from '@syncfusion/ej2-angular-charts';
import { JobService } from '../../../../core/services/job.service';

interface NetCashPoint {
  category: string;
  value: number;
}

// Port of StackedBarChart.razor ("Net Cash Out"). Despite the original Blazor component's name
// ("StackedBarChart"), the Angular ng2-charts version it replaced rendered a single, non-stacked
// bar series (one dataset only, `indexAxis: 'x'`) - so this keeps that same single-series shape
// but as a Syncfusion `Column` series rather than reaching for `StackedColumn` here; flag if the
// original Radzen markup (not staged locally) actually stacked multiple series for this widget.
@Component({
  selector: 'app-net-cash-chart',
  standalone: true,
  imports: [ChartModule],
  providers: [ColumnSeriesService, CategoryService, TooltipService],
  templateUrl: './net-cash-chart.component.html',
})
export class NetCashChartComponent implements OnInit {
  private jobService = inject(JobService);

  chartData: NetCashPoint[] = [];
  primaryXAxis = { valueType: 'Category' as const };
  primaryYAxis = { labelFormat: '{value}' };

  ngOnInit(): void {
    this.jobService.getNetCashChart().subscribe((datasets) => {
      const chart = datasets[0];
      if (!chart) return;
      const dataset = chart.datasets[0];
      const values = dataset?.data ?? [];
      this.chartData = chart.labels.map((label, i) => ({ category: label, value: values[i] ?? 0 }));
      this.cdr.detectChanges();
    });
  }
   constructor(
    private cdr: ChangeDetectorRef,
    ) {}
}
