import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A grid whose children go from 4 to 3 to 2 to 1 columns as space runs out, with no set column counts
 * per breakpoint and no shrinking. `min` is how narrow a child can get before it moves to the next row.
 *
 *   <app-responsive-grid [min]="300" gap="1.25rem">
 *     <app-dashboard-card title="...">...</app-dashboard-card>
 *   </app-responsive-grid>
 *
 * Give a child the class `span-all` to make it take the whole row.
 */
@Component({
  selector: 'app-responsive-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--rg-min]': 'min() + "px"', '[style.--rg-gap]': 'gap()' },
  template: '<ng-content />',
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--rg-min, 280px)), 1fr));
      gap: var(--rg-gap, 1rem);
    }

    :host ::ng-deep > .span-all {
      grid-column: 1 / -1;
    }
  `,
})
export class ResponsiveGridComponent {
  /** How narrow a child can get (CSS px) before it wraps. */
  readonly min = input(280);
  /** The CSS gap between children. */
  readonly gap = input('1rem');
}
