import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResponsiveGridComponent } from '../responsive-grid/responsive-grid.component';

export interface KpiItem {
  label: string;
  /** The main number or text, already formatted. */
  value: string | number;
  /** A small line under the value, such as "3 waiting for approval". */
  hint?: string;
  /** The value's colour: neutral (default), good (green), warn (amber) or bad (red). */
  tone?: 'default' | 'good' | 'warn' | 'bad';
  /** Makes the card a link. */
  link?: string | (string | number)[];
}

/**
 * The row of summary cards between the page header and the main content. The cards go from 4 to 3 to
 * 2 to 1 per row on their own (see ResponsiveGridComponent).
 *
 *   <app-kpi-cards [items]="[{ label: 'Waiting', value: 7 }, { label: 'Approved this week', value: 12, tone: 'good' }]" />
 */
@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResponsiveGridComponent, RouterLink],
  template: `
    @if (items().length) {
      <app-responsive-grid [min]="170" gap="0.75rem" role="list" aria-label="Summary">
        @for (k of items(); track k.label) {
          @if (k.link) {
            <a class="kpi" [class]="'kpi tone-' + (k.tone ?? 'default')" [routerLink]="k.link" role="listitem">
              <span class="kpi-label">{{ k.label }}</span>
              <span class="kpi-value">{{ k.value }}</span>
              @if (k.hint) { <span class="kpi-hint">{{ k.hint }}</span> }
            </a>
          } @else {
            <div [class]="'kpi tone-' + (k.tone ?? 'default')" role="listitem">
              <span class="kpi-label">{{ k.label }}</span>
              <span class="kpi-value">{{ k.value }}</span>
              @if (k.hint) { <span class="kpi-hint">{{ k.hint }}</span> }
            </div>
          }
        }
      </app-responsive-grid>
    }
  `,
  styles: `
    :host {
      display: block;
      margin: 0 0 1rem;
    }

    .kpi {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0.75rem 1rem;
      background: var(--sh-surface);
      border: 1px solid var(--sh-line);
      border-radius: 16px;
      box-shadow: var(--sh-shadow);
      text-decoration: none;
      color: inherit;
      min-width: 0;
    }

    a.kpi:hover {
      border-color: var(--sh-blue-2);
    }

    .kpi-label {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--sh-ink-2);
    }

    /* a small dot in the tone colour beside the label */
    .kpi-label::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--sh-blue);
    }

    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.2;
      color: var(--sh-ink);
    }

    .kpi-hint {
      font-size: 0.75rem;
      color: var(--sh-ink-3);
    }

    .tone-good .kpi-label::before { background: #14915b; }
    .tone-good .kpi-value { color: #14915b; }
    .tone-warn .kpi-label::before { background: #e0a100; }
    .tone-warn .kpi-value { color: #b7791f; }
    .tone-bad .kpi-label::before { background: #c2410c; }
    .tone-bad .kpi-value { color: #c2410c; }
  `,
})
export class KpiCardsComponent {
  readonly items = input<KpiItem[]>([]);
}
