import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import {
  CategoryService,
  ChartModule,
  DataLabelService,
  LegendService,
  StackingColumnSeriesService,
  TooltipService,
} from '@syncfusion/ej2-angular-charts';
import { CHART_AREA, CHART_COLORS, DATA_LABEL, LEGEND, ROUNDED_TOP, TOOLTIP, categoryAxis, moneyAxis, onAxisLabel, onDataLabel, onTooltip, useChartTheme } from '../../../../shared/charts/chart-style';

import { JobService } from '../../../../core/services/job.service';
import { MsalService } from '@azure/msal-angular';
import { AuthService } from '../../../../core/services/auth.service';
interface RetainStackedPoint {
  category: string;
  highest: number;
  lowest: number;
  regular: number;
}

@Component({
  selector: 'app-retain-stacked-chart',
  standalone: true,
  imports: [ChartModule],
  providers: [StackingColumnSeriesService, CategoryService, LegendService, TooltipService, DataLabelService],
  templateUrl: './retain-stacked-chart.component.html'
})
export class RetainStackedChartComponent implements OnInit {

  private jobService = inject(JobService);
  private authservice= inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  chartData: RetainStackedPoint[] = [];

  private userEmail = this.authservice.getLoggedInUserEmail();

  readonly chartTheme = useChartTheme();
  readonly colors = CHART_COLORS;
  readonly chartArea = CHART_AREA;
  readonly legendSettings = LEGEND;
  readonly tooltip = TOOLTIP;
  readonly rounded = ROUNDED_TOP;
  /** only the highest and lowest columns carry a label (zero points get none) */
  readonly marker = { dataLabel: DATA_LABEL('Top') };
  readonly primaryXAxis = categoryAxis({ labelIntersectAction: 'Rotate45', labelRotation: -45 });
  readonly primaryYAxis = moneyAxis({ minimum: 0 });
  readonly onAxisLabel = onAxisLabel;
  readonly onTooltip = onTooltip;
  readonly onDataLabel = onDataLabel;

  ngOnInit(): void {

    this.jobService
      .getSampleChartDatasets(this.authservice.getLoggedInUserEmail() ?? '')
      .subscribe((datasets) => {

        console.log('API datasets:', datasets);

        const chart = datasets?.[0];

        if (!chart) {
          console.warn('No chart data returned');
          return;
        }

        const dataset = chart.datasets?.[0];

        if (!dataset) {
          console.warn('No dataset returned');
          return;
        }

        const values = dataset.data ?? [];

        const max = Math.max(...values);
        const min = Math.min(...values);

        console.log('Labels:', chart.labels);
        console.log('Values:', values);
        console.log('Max:', max);
        console.log('Min:', min);

        this.chartData = chart.labels.map((label, i) => {

          const value = values[i] ?? 0;

          return {
            category: String(label),

            highest:
              value === max
                ? value
                : 0,

            lowest:
              value === min
                ? value
                : 0,

            regular:
              value !== max && value !== min
                ? value
                : 0
          };
        });

        console.log('Final chartData:', this.chartData);

        this.cdr.detectChanges();
      });
  }

  
}