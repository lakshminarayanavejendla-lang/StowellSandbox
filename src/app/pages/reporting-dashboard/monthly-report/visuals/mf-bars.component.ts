import { Component, computed, input } from '@angular/core';
import { BarRow, shortMoney } from './mf-data';

/**
 * Horizontal bars, one row per item. In the diverging form, negative values grow left from a centre
 * line and positive ones grow right (used for over/under billing). Empty, it shows grey placeholders.
 */
@Component({
  selector: 'app-mf-bars',
  standalone: true,
  template: `
    @if (rows().length) {
      @if (diverging()) {
        <div class="legend"><span><i class="neg"></i>{{ negLabel() }}</span><span><i class="pos"></i>{{ posLabel() }}</span></div>
      }
      <ul class="bars" [class.div]="diverging()">
        @for (r of view(); track r.label + r.sub; let i = $index) {
          <li>
            <span class="name"><strong>{{ r.label }}</strong>@if (r.sub) {<small>{{ r.sub }}</small>}</span>
            <span class="track">
              @if (diverging()) { <b class="axis"></b> }
              <i [class]="r.value < 0 ? 'neg' : 'pos'" [style.width.%]="r.pct" [style.animation-delay]="i * 60 + 'ms'"></i>
            </span>
            <span class="num" [class.neg]="diverging() && r.value < 0">{{ money(r.value) }}</span>
          </li>
        }
      </ul>
    } @else {
      <ul class="bars ghost" aria-hidden="true">
        @for (g of ghosts; track $index) {
          <li><span class="name"><strong>&nbsp;</strong></span><span class="track"><i [style.width.%]="g"></i></span><span class="num"></span></li>
        }
      </ul>
      <p class="empty">{{ empty() }}</p>
    }
  `,
  styles: `
    .bars {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }

    li {
      display: grid;
      grid-template-columns: minmax(90px, 34%) 1fr auto;
      align-items: center;
      gap: 0.75rem;
    }

    .name {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.25;
    }
    .name strong {
      font-size: 0.86rem;
      overflow-wrap: anywhere;
    }
    .name small {
      font-size: 0.74rem;
      color: var(--sh-ink-3);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .track {
      position: relative;
      height: 12px;
      background: var(--sh-surface-2);
      border-radius: 6px;
      overflow: hidden;
    }
    .track i {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      border-radius: 6px;
      background: linear-gradient(90deg, var(--sh-blue-2), var(--sh-blue));
      animation: grow 0.7s ease-out both;
      transform-origin: left;
    }

    .div .track .axis {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 2px;
      margin-left: -1px;
      background: var(--sh-line);
      z-index: 1;
    }
    .div .track i.neg {
      left: auto;
      right: 50%;
      background: #c2410c;
      transform-origin: right;
      border-radius: 6px 0 0 6px;
    }
    .div .track i.pos {
      left: 50%;
      background: var(--sh-blue);
      border-radius: 0 6px 6px 0;
    }

    .num {
      min-width: 70px;
      text-align: right;
      font-size: 0.84rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .num.neg {
      color: #c2410c;
    }

    .legend {
      display: flex;
      gap: 1.25rem;
      margin-bottom: 0.7rem;
      font-size: 0.78rem;
      color: var(--sh-ink-2);
    }
    .legend span {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .legend i {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }
    .legend i.neg {
      background: #c2410c;
    }
    .legend i.pos {
      background: var(--sh-blue);
    }

    .ghost .track i {
      background: var(--sh-line);
      animation: none;
    }

    .empty {
      margin: 0.75rem 0 0;
      text-align: center;
      font-size: 0.85rem;
      color: var(--sh-ink-3);
    }

    @keyframes grow {
      from {
        transform: scaleX(0);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .track i {
        animation: none;
      }
    }
  `,
})
export class MfBarsComponent {
  readonly rows = input<BarRow[]>([]);
  readonly diverging = input(false);
  readonly negLabel = input('Over');
  readonly posLabel = input('Under');
  readonly empty = input('No figures for this period yet.');

  readonly ghosts = [92, 70, 55, 38, 22];

  /** Each row with its bar length as a percent of the track (half the track when diverging). */
  readonly view = computed(() => {
    const rows = this.rows();
    const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
    const room = this.diverging() ? 50 : 100;
    return rows.map((r) => ({ ...r, pct: (Math.abs(r.value) / max) * room }));
  });

  money(n: number): string {
    return shortMoney(n);
  }
}
