import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/**
 * Counts a number up from its old value to the new one in about 0.8 seconds, easing out. Used on the dashboard's main figures.
 *
 *   <span [appCountUp]="openPos().length"></span>
 *   <span [appCountUp]="cashCollected()" format="money"></span>
 *
 * `null` shows an en dash. Users who ask for reduced motion get the final value straight away.
 */
@Directive({ selector: '[appCountUp]', standalone: true })
export class CountUpDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = input<number | null>(null, { alias: 'appCountUp' });
  readonly format = input<'int' | 'money'>('int');

  private shown = 0;
  private frame = 0;

  constructor() {
    effect(() => {
      const target = this.value();
      const fmt = this.format();
      cancelAnimationFrame(this.frame);

      if (target === null || target === undefined || Number.isNaN(target)) {
        this.el.nativeElement.textContent = '–';
        this.shown = 0;
        return;
      }

      const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        this.write(target, fmt);
        this.shown = target;
        return;
      }

      const from = this.shown;
      const start = performance.now();
      const duration = 600;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        this.shown = from + (target - from) * eased;
        this.write(this.shown, fmt);
        if (t < 1) this.frame = requestAnimationFrame(step);
        else this.shown = target;
      };
      this.frame = requestAnimationFrame(step);
    });
  }

  private write(n: number, fmt: 'int' | 'money'): void {
    this.el.nativeElement.textContent = fmt === 'money' ? money(n) : Math.round(n).toLocaleString('en-US');
  }
}

function money(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}
