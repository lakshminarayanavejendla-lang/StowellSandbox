import { Component, Input } from '@angular/core';

/**
 * Stand-in for every module not yet converted (Opps Pipeline, Estimation, Project Management,
 * Bids, Accounting, HR, BizOps, Reporting Dashboard, Phoenix Admin, Contacts, ...).
 * Keeps NavMenu links live and routable during Phase 1 (Shell + Dashboard); each of these
 * gets replaced with a real converted page in its own later phase.
 */
@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <div style="padding: 24px;">
      <h2>{{ title }}</h2>
      <p style="color:#666;">This module hasn't been converted from Blazor yet. It'll arrive in a later phase.</p>
    </div>
  `,
})
export class PlaceholderComponent {
  @Input() title = 'Coming soon';
}
