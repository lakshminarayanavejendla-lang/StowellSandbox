// Mirrors the (duplicated, locally-nested) ChartData/ChartDataset classes found in
// ColumnChart1.razor and LineChart1.razor's @code blocks - a Chart.js-shaped
// { labels, datasets[] } structure returned by the StowellCoAPI PmHome endpoints.
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

// Derived shape used by the Cash Collected vs Cash Paid widget (see Dashboard.razor.cs'
// TransformToCashData and ColumnChart1.razor's TransformToCashChartData).
export interface CashDataItem {
  category: string;
  cashCollected: number;
  cashPaid: number;
}
