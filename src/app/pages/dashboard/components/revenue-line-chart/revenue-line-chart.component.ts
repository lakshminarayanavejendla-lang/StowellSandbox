import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import {
  CategoryService,
  ChartModule,
  CrosshairService,
  SplineAreaSeriesService,
  TooltipService,
} from '@syncfusion/ej2-angular-charts';
import { CHART_AREA, CHART_COLORS, TOOLTIP, categoryAxis, moneyAxis, onAxisLabel, onTooltip, useChartTheme } from '../../../../shared/charts/chart-style';

import { JobService } from '../../../../core/services/job.service';

import { AuthService } from '../../../../core/services/auth.service';

interface RevenuePoint {
  category: string;
  value: number;
}

@Component({
  selector: 'app-revenue-line-chart',
  standalone: true,
  imports: [ChartModule],
  providers: [SplineAreaSeriesService, CategoryService, TooltipService, CrosshairService],
  templateUrl: './revenue-line-chart.component.html',
})
export class RevenueLineChartComponent implements OnInit {

  private jobService = inject(JobService);
  private authservice= inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  chartData: RevenuePoint[] = [];

  seriesName = 'Revenue';

  readonly chartTheme = useChartTheme();
  readonly colors = CHART_COLORS;
  readonly chartArea = CHART_AREA;
  readonly tooltip = { ...TOOLTIP, shared: false };
  readonly crosshair = { enable: true, lineType: 'Vertical', line: { width: 1, dashArray: '4,4' } };
  readonly marker = { visible: true, width: 8, height: 8, shape: 'Circle', isFilled: true, border: { width: 2, color: '#ffffff' } };
  readonly border = { width: 3, color: CHART_COLORS.blue };
  readonly primaryXAxis = categoryAxis({ labelIntersectAction: 'Rotate45' });
  readonly primaryYAxis = moneyAxis({ minimum: 0 });
  readonly onAxisLabel = onAxisLabel;
  readonly onTooltip = onTooltip;

  private userEmail = '';

  ngOnInit(): void {

    const email = this.authservice.getLoggedInUserEmail();

    console.log('Logged-in user:', email);

    if (!email) {
      console.warn('No logged-in MSAL account found.');
      return;
    }

    this.userEmail = email;

    this.jobService
      .getSampleChartDatasets(this.userEmail)
      .subscribe((datasets) => {

        console.log('Chart datasets:', datasets);

        const chart = datasets?.[0];

        if (!chart) {
          console.warn('No chart data returned.');
          return;
        }

        const dataset = chart.datasets?.[0];

        if (!dataset) {
          console.warn('No dataset returned.');
          return;
        }

        const values = dataset.data ?? [];

        this.seriesName = dataset.label ?? 'Revenue';

        this.chartData = chart.labels.map((label, i) => ({
          category: String(label),
          value: values[i] ?? 0
        }));

        console.log('Revenue chart data:', this.chartData);

        this.cdr.detectChanges();
      });
  }

  
}