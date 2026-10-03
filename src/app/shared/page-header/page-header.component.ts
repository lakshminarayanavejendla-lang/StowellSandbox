import { Component, Input } from '@angular/core';
import { Breadcrumb, BreadcrumbComponent } from '../../core/layout/breadcrumb/breadcrumb.component';

export type { Breadcrumb };

/**
 * The standard header at the top of every page:
 *
 *   breadcrumb                                (optional, app-breadcrumb in core/layout)
 *   large title  | actions | Stowell mark     (actions are content inside <div actions>...</div>)
 *
 * Each part adapts on its own: the breadcrumb wraps, the title and actions stack below 640px, and the
 * mark hides on phones. Below the header go the optional summary cards (app-kpi-cards), then the page.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [BreadcrumbComponent],
  template: `
    <app-breadcrumb [crumbs]="breadcrumbs"></app-breadcrumb>
    <div class="page-header">
      <h1 class="page-header-title">{{ title }}</h1>
      <div class="page-header-actions"><ng-content select="[actions]"></ng-content></div>
      <img class="page-header-logo" src="assets/images/stowell-home-logo.png" alt="Stowell Company Inc." />
    </div>
  `,
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() breadcrumbs: Breadcrumb[] = [];
}
