import { Component, Input } from '@angular/core';

/**
 * Faithful port of seven Blazor pages that are themselves just empty stubs in the source app -
 * OppsPipeline/Index.razor, Hr/Index.razor, and BizOps/{BIReports,Compliance,DevOps,Legal,
 * SysOps,VendorManagement}.razor are ALL literally just `<h3>{Title}</h3><hr />` with no
 * @code block, no service calls, nothing else. This isn't an under-conversion - it's a 1:1 port
 * of pages the original app never built out either. Replaces the generic PlaceholderComponent
 * for these seven routes since there's nothing more to "convert" here; if/when the Blazor app
 * grows real content on any of these pages, redo that one page as its own component.
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
