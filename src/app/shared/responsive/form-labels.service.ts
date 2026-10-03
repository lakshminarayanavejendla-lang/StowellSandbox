import { Injectable } from '@angular/core';

/**
 * Accessibility: links each visible <label> to its control (WCAG 1.3.1 and 4.1.2).
 *
 * The forms use <div class="field"><label>Name</label><input/></div>, with the label beside the
 * control instead of around it. So screen readers announce an unnamed field, and clicking the label
 * does nothing. Instead of editing about 200 fields by hand, this watches the page. For each .field
 * with one label and one unnamed control, it gives the control an id and sets the label's `for`.
 * Controls that already have an id, aria-label, aria-labelledby or a wrapping label are left alone,
 * and Syncfusion widgets, which name their own inputs, are skipped.
 */
@Injectable({ providedIn: 'root' })
export class FormLabelsService {
  private observer: MutationObserver | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;

  start(): void {
    if (this.observer || typeof document === 'undefined') return;
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.schedule();
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.apply();
    }, 60);
  }

  private apply(): void {
    // Keyboard users need to be able to scroll a grid body that scrolls (WCAG 2.1.1).
    document.querySelectorAll<HTMLElement>('.e-grid .e-content:not([tabindex])').forEach((el) => el.setAttribute('tabindex', '0'));
    document.querySelectorAll<HTMLElement>('.field').forEach((field) => {
      const labels = field.querySelectorAll(':scope > label');
      if (labels.length !== 1) return;
      const label = labels[0] as HTMLLabelElement;
      if (label.htmlFor || label.querySelector('input,select,textarea')) return;
      const control = field.querySelector<HTMLElement>(':scope > input, :scope > select, :scope > textarea');
      if (!control || control.closest('.e-control-wrapper,.e-input-group')) return;
      if (control.getAttribute('type') === 'hidden' || control.hasAttribute('hidden')) return;
      if (control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return;
      if (!control.id) control.id = `fld-${++this.seq}`;
      label.htmlFor = control.id;
    });
  }
}
