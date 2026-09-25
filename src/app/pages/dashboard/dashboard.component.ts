import { Component } from '@angular/core';
import { CurrentJobsComponent } from './components/current-jobs/current-jobs.component';
import { CashCollectedChartComponent } from './components/cash-collected-chart/cash-collected-chart.component';
import { RevenueLineChartComponent } from './components/revenue-line-chart/revenue-line-chart.component';
import { NetCashChartComponent } from './components/net-cash-chart/net-cash-chart.component';
import { RetainStackedChartComponent } from './components/retain-stacked-chart/retain-stacked-chart.component';
import { CalendarWidgetComponent } from './components/calendar-widget/calendar-widget.component';

// Port of Components/Pages/Dashboard.razor + Dashboard.razor.cs.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CurrentJobsComponent,
    CashCollectedChartComponent,
    RevenueLineChartComponent,
    NetCashChartComponent,
    RetainStackedChartComponent,
    CalendarWidgetComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {}
