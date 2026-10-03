import { computed, inject } from '@angular/core';
import { ThemeService } from '../../core/layout/theme.service';

/**
 * Shared look for the dashboard charts (Syncfusion ejs-chart): one palette, soft dashed gridlines, no
 * axis lines or borders, dollar formatting on axes, labels and tooltips, and a chart theme that
 * follows the portal's light or dark setting.
 */

export const CHART_COLORS = {
  blue: '#2563c9',
  blueSoft: '#6f9be0',
  accent: '#f26b2a',
  slate: '#8492a8',
  navy: '#0e2440',
  green: '#14915b',
};

const FONT = 'Manrope, Helvetica Neue, Arial, sans-serif';

/** $1.24M / $880K / $900 */
export function money(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** $1,234,567 */
export function moneyFull(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** The chart theme for the current portal theme. Use as `[theme]="chartTheme()"`. */
export function useChartTheme() {
  const theme = inject(ThemeService);
  return computed(() => (theme.theme() === 'dark' ? ('Bootstrap5Dark' as const) : ('Bootstrap5' as const)));
}

// ---- axes ----
const labelStyle = { fontFamily: FONT, size: '12px', fontWeight: '600' };

/** The category (job or file) axis: no lines, ticks or gridlines. */
export const categoryAxis = (extra: object = {}): any => ({
  valueType: 'Category',
  majorGridLines: { width: 0 },
  majorTickLines: { width: 0 },
  lineStyle: { width: 0 },
  labelStyle,
  ...extra,
});

/** The dollar axis: soft dashed gridlines and short labels (see onAxisLabel). */
export const moneyAxis = (extra: object = {}): any => ({
  majorGridLines: { width: 1, dashArray: '3,6' },
  minorGridLines: { width: 0 },
  majorTickLines: { width: 0 },
  lineStyle: { width: 0 },
  labelStyle,
  ...extra,
});

export const CHART_AREA: any = { border: { width: 0 } };

export const LEGEND: any = {
  visible: true,
  position: 'Top',
  alignment: 'Far',
  shapeHeight: 10,
  shapeWidth: 10,
  padding: 8,
  textStyle: { fontFamily: FONT, size: '12px', fontWeight: '600' },
};

export const TOOLTIP: any = {
  enable: true,
  enableMarker: true,
  textStyle: { fontFamily: FONT, size: '12px' },
};

/** Rounded top corners on columns and bars. */
export const ROUNDED_TOP: any = { topLeft: 7, topRight: 7 };
export const ROUNDED_END: any = { topRight: 7, bottomRight: 7 };

// ---- event handlers (bind with (axisLabelRender), (tooltipRender), (textRender)) ----

/** The value axis shows $K and $M instead of raw numbers. */
export function onAxisLabel(args: any): void {
  if (args?.axis?.name === 'primaryYAxis') args.text = money(Number(args.value));
}

/** Tooltips show the full dollar amount. */
export function onTooltip(args: any): void {
  const p = args?.point ?? args?.data;
  const y = p?.y ?? p?.pointY;
  const x = p?.x ?? p?.pointX;
  const name = args?.series?.name ?? '';
  if (y === undefined) return;
  args.headerText = String(x);
  args.text = `${name}: ${moneyFull(Number(y))}`;
}

/** Data labels as $K and $M; zero values get no label. */
export function onDataLabel(args: any): void {
  const y = Number(args?.point?.y ?? 0);
  args.text = y ? money(y) : '';
}

export const DATA_LABEL = (position = 'Outer'): any => ({
  visible: true,
  position,
  font: { fontFamily: FONT, size: '11px', fontWeight: '700' },
});
