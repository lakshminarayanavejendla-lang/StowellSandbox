import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import {
  CategoryService,
  ChartModule,
  LineSeriesService,
  TooltipService,
} from '@syncfusion/ej2-angular-charts';

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
  providers: [
    LineSeriesService,
    CategoryService,
    TooltipService
  ],
  templateUrl: './revenue-line-chart.component.html',
})
export class RevenueLineChartComponent implements OnInit {

  private jobService = inject(JobService);
  private authservice= inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  chartData: RevenuePoint[] = [];

  seriesName = 'Revenue';

  primaryXAxis = {
    valueType: 'Category' as const
  };

  primaryYAxis = {
    labelFormat: '{value}'
  };

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