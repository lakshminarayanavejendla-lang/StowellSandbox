import { Component, Input } from '@angular/core';

/**
 * A stand-in for pages that aren't converted yet, so their menu links still go somewhere. Each one is
 * replaced when its page is converted.
 */
@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <div style="padding: 24px;">
      <h2>{{ title }}</h2>
      <p style="color:var(--sh-ink-3);">This module hasn't been converted from Blazor yet. It'll arrive in a later phase.</p>
    </div>
  `,
})
export class PlaceholderComponent {
  @Input() title = 'Coming soon';
}
