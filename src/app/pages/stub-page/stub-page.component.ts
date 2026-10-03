import { Component, Input } from '@angular/core';

/**
 * Seven pages that are empty in the Blazor app too: OppsPipeline, Hr, and BizOps BIReports,
 * Compliance, DevOps, Legal, SysOps and VendorManagement. Each is just <h3>{Title}</h3><hr /> with
 * no code, so this shows the same. If one of them gets real content, give it its own component.
 */
@Component({
  selector: 'app-stub-page',
  standalone: true,
  template: `
    <h3>{{ title }}</h3>
    <hr />
  `,
})
export class StubPageComponent {
  @Input() title = '';
}
