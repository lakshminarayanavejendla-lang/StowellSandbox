import { Component } from '@angular/core';

/**
 * Workspace: the scrolling area that holds the current page (page header, summary/KPI region, primary content). It is the target of the
 * "Skip to main content" link (id="main-content"), and the only part of the shell that scrolls.
 */
@Component({
  selector: 'app-workspace',
  standalone: true,
  template: `<main class="content-wrapper" id="main-content" tabindex="-1"><ng-content /></main>`,
  styles: `
    :host {
      display: contents;
    }

    .content-wrapper {
      flex: 1;
      padding: 1.5rem;
      overflow: auto;
      background: var(--sh-bg);
    }

    .content-wrapper:focus {
      outline: none;
    }

    @media (max-width: 1023px) {
      .content-wrapper {
        padding: 0.75rem;
      }
    }
  `,
})
export class WorkspaceComponent {}
