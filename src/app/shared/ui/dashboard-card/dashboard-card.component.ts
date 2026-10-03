import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The standard box for a widget on a dashboard or summary page: a title bar, with optional actions on
 * the right, and a body. It's a size container, so its contents can respond to the card's width
 * (container queries) instead of the screen's.
 *
 *   <app-dashboard-card title="Current Jobs" accent="#1c84c6" class="span-all">
 *     <button actions type="button">Export</button>
 *     ...content...
 *   </app-dashboard-card>
 */
@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--card-accent]': 'accent()' },
  template: `
    @if (title()) {
      <header class="card-head">
        <h4 class="card-title">{{ title() }}</h4>
        <div class="card-actions"><ng-content select="[actions]" /></div>
      </header>
    }
    <div class="card-body"><ng-content /></div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      container-type: inline-size;
      background: var(--sh-surface);
      border: 1px solid var(--sh-line);
      border-radius: 16px;
      padding: 1.25rem;
      box-shadow: var(--sh-shadow);
    }

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    /* Bootstrap's card-body class adds its own padding, which pushed the content in from the title */
    .card-body {
      padding: 0;
    }

    .card-title {
      margin: 0;
      color: var(--sh-ink);
      font-size: 1rem;
      font-weight: 700;
    }

    .card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;

      &:empty {
        display: none;
      }
    }

    @media (max-width: 767px) {
      :host {
        padding: 0.75rem;
      }
    }
  `,
})
export class DashboardCardComponent {
  readonly title = input('');
  /** The colour of the card's top edge. */
  readonly accent = input('#00355f');
}
