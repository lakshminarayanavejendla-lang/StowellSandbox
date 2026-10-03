import { Injectable, effect, inject } from '@angular/core';
import { ViewportService } from './viewport.service';

/**
 * On phones each grid row becomes a card.
 *
 * The CSS does the layout (`.e-grid.black-grid` under 768px in _global-responsive.scss): it hides the
 * header and shows each row as lines of "Label  value". Syncfusion cells have no label, so on phones
 * this copies each column's header text onto its cells as `data-label`, which the CSS shows with
 * attr(data-label). It does nothing on wider screens.
 */
@Injectable({ providedIn: 'root' })
export class GridCardLabelsService {
  private viewport = inject(ViewportService);
  private observer: MutationObserver | null = null;
  private frame = 0;

  constructor() {
    effect(() => {
      if (this.viewport.isMobile()) this.start();
      else this.stop();
    });
  }

  private start(): void {
    if (this.observer || typeof document === 'undefined') return;
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.schedule();
  }

  private stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.label();
    });
  }

  private label(): void {
    document.querySelectorAll<HTMLElement>('.e-grid.black-grid').forEach((grid) => {
      // Header text by column number, starting at 1. Hidden columns still have a header cell.
      const names = new Map<string, string>();
      grid.querySelectorAll('.e-headercontent th.e-headercell').forEach((th) => {
        const text = th.querySelector('.e-headertext')?.textContent?.trim();
        const idx = th.getAttribute('aria-colindex');
        if (idx && text) names.set(idx, text);
      });
      if (!names.size) return;
      grid.querySelectorAll<HTMLElement>('.e-content td.e-rowcell').forEach((td) => {
        const label = names.get(td.getAttribute('aria-colindex') ?? '');
        if (label && td.getAttribute('data-label') !== label) td.setAttribute('data-label', label);
      });
    });
  }
}
