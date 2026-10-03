// The ChartData and ChartDataset classes from ColumnChart1.razor and LineChart1.razor: a
// Chart.js-style { labels, datasets[] } that the PmHome endpoints return.
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

// The shape used by the Cash Collected vs Cash Paid chart (from TransformToCashData in
// Dashboard.razor.cs and TransformToCashChartData in ColumnChart1.razor).
export interface CashDataItem {
  category: string;
  cashCollected: number;
  cashPaid: number;
}
