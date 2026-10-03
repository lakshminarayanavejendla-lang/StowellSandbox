import { Component, input } from '@angular/core';

/** One key-figure card. */
export interface MfKpi {
  label: string;
  /** The figure, already formatted ($1.24M, 62%, "Yes"). */
  value: string;
  hint?: string;
  /** A Bootstrap icon class, such as 'bi-cash-coin'. */
  icon?: string;
  /** Colours the value: good (green), warn (amber) or bad (red). */
  tone?: 'good' | 'warn' | 'bad';
  /** Percent change from the prior year. Up is green, down is red. */
  delta?: number | null;
  /** Set for costs, where a rise is bad. */
  lowerIsBetter?: boolean;
}

/** A row of key-figure cards, in the same style as the home page's. */
@Component({
  selector: 'app-mf-kpis',
  standalone: true,
  template: `
    <div class="kpis">
      @for (k of items(); track k.label; let i = $index) {
        <div class="kpi" [class]="'kpi ' + (k.tone ?? '')" [style.animation-delay]="i * 60 + 'ms'">
          <span class="lab"><span class="ico"><i class="bi" [class]="k.icon ?? 'bi-bar-chart'" aria-hidden="true"></i></span>{{ k.label }}</span>
          <span class="val">{{ k.value }}</span>
          <span class="foot">
            @if (k.delta !== null && k.delta !== undefined) {
              <span class="delta" [class.good]="isGood(k)" [class.bad]="!isGood(k)">
                <i class="bi" [class.bi-arrow-up-short]="k.delta >= 0" [class.bi-arrow-down-short]="k.delta < 0" aria-hidden="true"></i>{{ abs(k.delta).toFixed(abs(k.delta) < 10 ? 1 : 0) }}%
              </span>
            }
            @if (k.hint) {
              <span class="hint">{{ k.hint }}</span>
            }
          </span>
        </div>
      }
    </div>
  `,
  styles: `
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 1rem;
    }

    .kpi {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1.05rem 1.2rem;
      background: var(--sh-surface);
      border: 1px solid var(--sh-line);
      border-radius: 16px;
      box-shadow: var(--sh-shadow);
      animation: rise 0.35s ease both;
    }

    .lab {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--sh-ink-2);
    }

    .ico {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      color: var(--sh-blue);
      background: var(--sh-blue-soft);
      border-radius: 9px;
    }

    .val {
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      color: var(--sh-ink);
    }

    .good .val {
      color: #14915b;
    }

    .warn .val {
      color: #b7791f;
    }

    .bad .val {
      color: #c2410c;
    }

    .foot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0.6rem;
      min-height: 1.4rem;
    }

    .hint {
      font-size: 0.78rem;
      color: var(--sh-ink-3);
    }

    .delta {
      display: inline-flex;
      align-items: center;
      padding: 0.05rem 0.5rem 0.05rem 0.2rem;
      font-size: 0.76rem;
      font-weight: 800;
      border-radius: 999px;
    }
    .delta.good {
      color: #14915b;
      background: rgba(20, 145, 91, 0.12);
    }
    .delta.bad {
      color: #c2410c;
      background: rgba(194, 65, 12, 0.12);
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .kpi {
        animation: none;
      }
    }
  `,
})
export class MfKpisComponent {
  readonly items = input<MfKpi[]>([]);

  abs(n: number): number {
    return Math.abs(n);
  }

  /** Whether a change is good news: a rise is good, unless lower is better. */
  isGood(k: MfKpi): boolean {
    return (k.delta ?? 0) >= 0 !== !!k.lowerIsBetter;
  }
}
