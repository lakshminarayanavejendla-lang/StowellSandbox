import { Injectable } from '@angular/core';

/**
 * Lets people choose which grid columns to show.
 *
 * Every data grid (`ejs-grid.black-grid`) gets Syncfusion's Column Chooser in a small toolbar, so on a
 * tablet or small laptop you can bring back a column the layout hid (see `hideAtMedia` on the queue
 * grids) or hide one you don't need. This browser remembers the choice for each page and applies it
 * the next time the grid shows.
 *
 * Grids that have their own toolbar, or fewer than 4 columns, are skipped. Only columns the user
 * switched are remembered, not ones `hideAtMedia` hid, so a saved choice never hides a column on a
 * large screen.
 */
@Injectable({ providedIn: 'root' })
export class GridColumnsService {
  private observer: MutationObserver | null = null;
  private frame = 0;
  private readonly done = new WeakSet<object>();

  start(): void {
    if (this.observer || typeof document === 'undefined') return;
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.schedule();
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.enhanceAll();
    });
  }

  private enhanceAll(): void {
    const grids = Array.from(document.querySelectorAll<HTMLElement>('ejs-grid.black-grid'));
    grids.forEach((el, index) => this.enhance(el, index));
  }

  private enhance(el: HTMLElement, index: number): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grid = (el as any).ej2_instances?.[0];
    if (!grid || this.done.has(grid) || grid.isDestroyed) return;
    if (!el.querySelector('.e-gridheader')) return; // not rendered yet - try again on the next change

    this.done.add(grid);
    if ((grid.getColumns?.().length ?? 0) < 4) return;
    if (Array.isArray(grid.toolbar) && grid.toolbar.length) return; // the page has its own toolbar

    const key = `grid-cols:${location.pathname}:${index}`;
    const saved = this.load(key);

    grid.showColumnChooser = true;
    grid.toolbar = ['ColumnChooser'];

    // Apply what the user chose last time.
    const hide = Object.keys(saved).filter((f) => saved[f] === false);
    const show = Object.keys(saved).filter((f) => saved[f] === true);
    if (hide.length) grid.hideColumns(hide, 'field');
    if (show.length) grid.showColumns(show, 'field');

    // Remember any further changes made in the chooser.
    grid.addEventListener('actionComplete', (args: { requestType?: string; columns?: { field?: string; visible?: boolean }[] }) => {
      if (args.requestType !== 'columnstate' || !args.columns) return;
      const current = this.load(key);
      for (const c of args.columns) if (c.field) current[c.field] = !!c.visible;
      this.save(key, current);
    });
  }

  private load(key: string): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '{}');
    } catch {
      return {};
    }
  }

  private save(key: string, value: Record<string, boolean>): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage isn't available, so the choice lasts until the page is left */
    }
  }
}
