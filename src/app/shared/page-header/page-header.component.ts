import { Component, Input } from '@angular/core';

/**
 * Standard branded header for every form/list page: Stowell wordmark, page title,
 * rule underneath. Replaces the ad-hoc per-page <h2>/<h3>/<h4> + <hr> headers.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="page-header">
      <img class="page-header-logo" src="assets/images/stowell-home-logo.png" alt="Stowell Company Inc." />
      <h1 class="page-header-title">{{ title }}</h1>
    </div>
    <hr class="page-header-rule" />
  `,
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  @Input() title = '';
}
