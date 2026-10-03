import { Injectable } from '@angular/core';

type Tone = 'ok' | 'info' | 'warn' | 'bad' | 'mute';

/** Maps status text to a colour group. The first match wins. */
const TONES: [RegExp, Tone][] = [
  [/^(approved|complete|completed|paid|won|received|done|posted|coded|active)$/i, 'ok'],
  [/^(rejected|refused|lost|cancel+ed|denied|failed|overdue|declined|void(ed)?)$/i, 'bad'],
  [/^(pending|draft|waiting|on[- ]hold|hold|in review|review|bid|open bid|submitted for approval|to code|awaiting.*)$/i, 'warn'],
  [/^(open|current|contract|in progress|submitted|new|issued|sent|partial.*)$/i, 'info'],
  [/^(closed|inactive|archived|n\/a|none)$/i, 'mute'],
];

/**
 * Turns the text in every grid column named "... Status" into a coloured pill, so all the queues look
 * the same without changing each page's grid. It uses a MutationObserver, like
 * GridCardLabelsService, because Syncfusion rebuilds cells when you page, sort or filter; new cells
 * are picked up on the next frame. Cells with their own markup are left alone.
 */
@Injectable({ providedIn: 'root' })
export class GridStatusPillsService {
  private observer: MutationObserver | null = null;
  private frame = 0;

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
      this.apply();
    });
  }

  private apply(): void {
    document.querySelectorAll<HTMLElement>('.e-grid').forEach((grid) => {
      const statusCols = new Set<string>();
      grid.querySelectorAll('.e-headercontent th.e-headercell').forEach((th) => {
        const text = th.querySelector('.e-headertext')?.textContent?.trim() ?? '';
        const idx = th.getAttribute('aria-colindex');
        if (idx && /(^|\s)status$/i.test(text)) statusCols.add(idx);
      });
      if (!statusCols.size) return;

      grid.querySelectorAll<HTMLElement>('.e-content td.e-rowcell:not([data-pill])').forEach((td) => {
        if (!statusCols.has(td.getAttribute('aria-colindex') ?? '')) return;
        td.setAttribute('data-pill', '1');
        // Skip cells that have their own markup (templates, links, buttons).
        if (td.children.length) return;
        const text = td.textContent?.trim();
        if (!text) return;
        const tone = TONES.find(([re]) => re.test(text))?.[1] ?? 'mute';
        const pill = document.createElement('span');
        pill.className = `st-pill st-${tone}`;
        pill.textContent = text;
        td.textContent = '';
        td.appendChild(pill);
      });
    });
  }
}
