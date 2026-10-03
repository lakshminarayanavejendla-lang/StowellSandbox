import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Breadcrumb {
  label: string;
  /** omit for the current page (the last crumb) */
  route?: string | (string | number)[];
}

/**
 * Breadcrumb trail (part of the standard page header): `Accounting / PO Queue`. The last crumb is the current page and is not a link.
 * Wraps onto extra lines on narrow screens instead of overflowing.
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (crumbs().length) {
      <nav class="page-breadcrumb" aria-label="Breadcrumb">
        <ol>
          @for (c of crumbs(); track $index; let last = $last) {
            <li>
              @if (c.route && !last) {
                <a [routerLink]="c.route">{{ c.label }}</a>
              } @else {
                <span [attr.aria-current]="last ? 'page' : null">{{ c.label }}</span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: `
    .page-breadcrumb {
      margin-bottom: 6px;
      font-size: 13px;
    }

    ol {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 0;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li + li::before {
      content: '/';
      padding: 0 8px;
      color: var(--sh-ink-3);
    }

    span {
      color: var(--sh-ink-2);
    }
  `,
})
export class BreadcrumbComponent {
  readonly crumbs = input<Breadcrumb[]>([]);
}
