import { Component, computed, input } from '@angular/core';
import { StackSegment, shortMoney } from './mf-data';

/** One stacked bar split into coloured parts, with a legend showing each part's amount and share. */
@Component({
  selector: 'app-mf-stack',
  standalone: true,
  template: `
    <div class="bar" role="img" [attr.aria-label]="ariaLabel()">
      @for (s of parts(); track s.label; let i = $index) {
        <i [style.flex]="s.value" [style.background]="s.color" [style.animation-delay]="i * 90 + 'ms'" [title]="s.label + ': ' + money(s.value)"></i>
      } @empty {
        <i class="ghost" style="flex: 1"></i>
      }
    </div>
    <ul class="legend">
      @for (s of segments(); track s.label) {
        <li [class.zero]="!s.value">
          <i [style.background]="s.color"></i>
          <span class="name">{{ s.label }}</span>
          <span class="amt">{{ money(s.value) }}</span>
          <span class="share">{{ total() ? ((s.value / total()) * 100).toFixed(0) + '%' : '' }}</span>
        </li>
      }
    </ul>
    @if (!parts().length) {
      <p class="empty">{{ empty() }}</p>
    }
  `,
  styles: `
    .bar {
      display: flex;
      gap: 3px;
      height: 26px;
      overflow: hidden;
      border-radius: 8px;
    }
    .bar i {
      min-width: 4px;
      animation: grow 0.7s ease-out both;
      transform-origin: left;
    }
    .bar i.ghost {
      background: var(--sh-surface-2);
      border: 1px dashed var(--sh-line);
      border-radius: 8px;
      animation: none;
    }

    .legend {
      margin: 0.9rem 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .legend li {
      display: grid;
      grid-template-columns: 12px 1fr auto 44px;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.84rem;
    }
    .legend li.zero {
      opacity: 0.55;
    }
    .legend li i {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }
    .legend .amt {
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .legend .share {
      text-align: right;
      font-size: 0.78rem;
      color: var(--sh-ink-3);
    }

    .empty {
      margin: 0.6rem 0 0;
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
      .bar i {
        animation: none;
      }
    }
  `,
})
export class MfStackComponent {
  readonly segments = input<StackSegment[]>([]);
  readonly empty = input('No figures for this period yet.');

  /** Only the parts that have an amount are drawn. */
  readonly parts = computed(() => this.segments().filter((s) => s.value > 0));
  readonly total = computed(() => this.parts().reduce((a, s) => a + s.value, 0));
  readonly ariaLabel = computed(() => this.parts().map((s) => `${s.label} ${shortMoney(s.value)}`).join(', ') || 'No figures yet');

  money(n: number): string {
    return shortMoney(n);
  }
}
