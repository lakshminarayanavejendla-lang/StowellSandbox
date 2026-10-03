import { Component, computed, input } from '@angular/core';

const R = 52;
const C = 2 * Math.PI * R;

/** A ring showing a percentage, with a label in the middle. */
@Component({
  selector: 'app-mf-ring',
  standalone: true,
  template: `
    <div class="wrap">
      <svg viewBox="0 0 140 140" role="img" [attr.aria-label]="label() + ' ' + text()">
        <circle class="track" cx="70" cy="70" [attr.r]="r" />
        <circle class="fill" cx="70" cy="70" [attr.r]="r" [attr.stroke-dasharray]="dash()" [style.--len]="filled()" transform="rotate(-90 70 70)" />
        <text x="70" y="74" text-anchor="middle" class="num">{{ text() }}</text>
        <text x="70" y="94" text-anchor="middle" class="sub">{{ label() }}</text>
      </svg>
    </div>
  `,
  styles: `
    .wrap {
      display: grid;
      place-items: center;
    }

    svg {
      width: 150px;
      height: 150px;
    }

    circle {
      fill: none;
      stroke-width: 13;
      stroke-linecap: round;
    }

    .track {
      stroke: var(--sh-surface-2);
    }

    .fill {
      stroke: #14915b;
      animation: draw 1s ease-out both;
    }

    .num {
      font-size: 26px;
      font-weight: 800;
      fill: var(--sh-ink);
    }

    .sub {
      font-size: 11px;
      font-weight: 600;
      fill: var(--sh-ink-3);
    }

    @keyframes draw {
      from {
        stroke-dasharray: 0 400;
      }
      to {
        stroke-dasharray: calc(var(--len) * 1px) 400;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .fill {
        animation: none;
      }
    }
  `,
})
export class MfRingComponent {
  /** 0 to 100, or null before there is anything to show. */
  readonly value = input<number | null>(null);
  readonly label = input('complete');

  readonly r = R;
  readonly filled = computed(() => (Math.max(0, Math.min(100, this.value() ?? 0)) / 100) * C);
  readonly dash = computed(() => `${this.filled()} 400`);
  readonly text = computed(() => (this.value() === null ? '–' : `${Math.round(this.value()!)}%`));
}
