import { Component, computed, input } from '@angular/core';
import { WaterfallStep, shortMoney } from './mf-data';

interface Bar {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'total' | 'up' | 'down' | 'ghost';
  label: string;
  value: string;
  /** Where the value sits: above the bar, or below it for a bar that goes down. */
  valueY: number;
}

const W = 760;
const H = 280;
const LEFT = 12;
const RIGHT = 12;
const TOP = 30;
const BOTTOM = 56;

// shapes shown (grey) until there are figures
const GHOST = [0.9, 0.55, 0.7, 0.4, 0.2, 0.5];

/**
 * A waterfall chart: totals stand on the baseline in blue, and each step floats from where the last
 * one ended, green for a gain and red for a cost. Empty, it shows grey placeholder bars.
 */
@Component({
  selector: 'app-mf-waterfall',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" role="img" [attr.aria-label]="ariaLabel()">
      <line class="base" [attr.x1]="left" [attr.x2]="w - right" [attr.y1]="zeroY()" [attr.y2]="zeroY()" />
      @for (c of connectors(); track $index) {
        <line class="conn" [attr.x1]="c.x1" [attr.x2]="c.x2" [attr.y1]="c.y" [attr.y2]="c.y" />
      }
      @for (b of bars(); track $index; let i = $index) {
        <rect [class]="'bar ' + b.kind" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="5" [style.animation-delay]="i * 80 + 'ms'" />
        @if (b.value) {
          <text class="val" [attr.x]="b.x + b.w / 2" [attr.y]="b.valueY" text-anchor="middle">{{ b.value }}</text>
        }
        <text class="lab" [attr.x]="b.x + b.w / 2" [attr.y]="h - bottom + 20" text-anchor="middle">
          @for (line of lines(b.label); track $index; let li = $index) {
            <tspan [attr.x]="b.x + b.w / 2" [attr.dy]="li === 0 ? 0 : 14">{{ line }}</tspan>
          }
        </text>
      }
    </svg>
    @if (!steps().length) {
      <p class="empty">No figures for this period yet.</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .base {
      stroke: var(--sh-line);
      stroke-width: 1.5;
    }

    .conn {
      stroke: var(--sh-ink-3);
      stroke-width: 1;
      stroke-dasharray: 3 3;
    }

    .bar {
      transform-box: fill-box;
      transform-origin: bottom;
      animation: grow 0.6s ease-out both;
    }
    .bar.total {
      fill: var(--sh-blue);
    }
    .bar.up {
      fill: #14915b;
    }
    .bar.down {
      fill: #c2410c;
    }
    .bar.ghost {
      fill: var(--sh-surface-2);
      stroke: var(--sh-line);
    }

    .val {
      font-size: 12.5px;
      font-weight: 800;
      fill: var(--sh-ink);
    }

    .lab {
      font-size: 11.5px;
      font-weight: 600;
      fill: var(--sh-ink-2);
    }

    .empty {
      margin: 0.25rem 0 0;
      text-align: center;
      font-size: 0.85rem;
      color: var(--sh-ink-3);
    }

    @keyframes grow {
      from {
        transform: scaleY(0);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
      }
    }
  `,
})
export class MfWaterfallComponent {
  readonly steps = input<WaterfallStep[]>([]);

  readonly w = W;
  readonly h = H;
  readonly left = LEFT;
  readonly right = RIGHT;
  readonly bottom = BOTTOM;

  /** Each step's start and end on the value axis. */
  private readonly spans = computed(() => {
    let run = 0;
    return this.steps().map((s) => {
      const start = s.kind === 'total' ? 0 : run;
      const end = s.kind === 'total' ? s.value : run + s.value;
      run = end;
      return { start, end };
    });
  });

  private readonly range = computed(() => {
    const all = this.spans().flatMap((s) => [s.start, s.end]);
    const lo = Math.min(0, ...all);
    const hi = Math.max(0, ...all);
    return { lo, hi: hi === lo ? lo + 1 : hi };
  });

  private y(v: number): number {
    const { lo, hi } = this.range();
    return TOP + ((hi - v) / (hi - lo)) * (H - TOP - BOTTOM);
  }

  readonly zeroY = computed(() => (this.steps().length ? this.y(0) : H - BOTTOM));

  readonly bars = computed<Bar[]>(() => {
    const steps = this.steps();
    const n = steps.length || GHOST.length;
    const slot = (W - LEFT - RIGHT) / n;
    const bw = slot * 0.58;
    if (!steps.length) {
      return GHOST.map((g, i) => {
        const h = g * (H - TOP - BOTTOM);
        return { x: LEFT + slot * i + (slot - bw) / 2, y: H - BOTTOM - h, w: bw, h, kind: 'ghost' as const, label: '', value: '', valueY: 0 };
      });
    }
    return steps.map((s, i) => {
      const sp = this.spans()[i];
      const top = this.y(Math.max(sp.start, sp.end));
      const bottom = this.y(Math.min(sp.start, sp.end));
      const h = Math.max(bottom - top, 2);
      const kind = s.kind === 'total' ? 'total' : s.value >= 0 ? 'up' : 'down';
      return {
        x: LEFT + slot * i + (slot - bw) / 2,
        y: top,
        w: bw,
        h,
        kind,
        label: s.label,
        value: shortMoney(s.value),
        valueY: top - 8,
      } as Bar;
    });
  });

  /** Dashed lines joining the end of one bar to the start of the next. */
  readonly connectors = computed(() => {
    const bars = this.bars();
    const steps = this.steps();
    if (!steps.length) return [];
    return this.spans()
      .slice(0, -1)
      .map((sp, i) => ({ x1: bars[i].x + bars[i].w, x2: bars[i + 1].x, y: this.y(sp.end) }));
  });

  readonly ariaLabel = computed(() => (this.steps().length ? 'Waterfall: ' + this.steps().map((s) => `${s.label} ${shortMoney(s.value)}`).join(', ') : 'Waterfall chart with no figures yet'));

  /** Splits a label onto two lines so it fits under its bar. */
  lines(label: string): string[] {
    if (label.length <= 14) return [label];
    const mid = label.lastIndexOf(' ', 15);
    return mid > 0 ? [label.slice(0, mid), label.slice(mid + 1)] : [label];
  }
}
