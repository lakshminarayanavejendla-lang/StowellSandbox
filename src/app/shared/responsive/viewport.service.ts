import { Injectable, NgZone, Signal, effect, inject, signal } from '@angular/core';

/**
 * The responsive display standard (Warren Hampton, 2026-09-16) designs to the viewport width in CSS
 * pixels. The main target is 1440x900, with full support down to 1024x768, tablet portrait from 768
 * and phones down to about 360.
 *
 * CSS handles the layout (see _breakpoints.scss). This service is only for behaviour CSS can't do,
 * such as closing the sidebar drawer or changing how the toolbar works. Don't use it to work out
 * element widths. Keep the breakpoints here the same as _breakpoints.scss.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private zone = inject(NgZone);

  private readonly _isMobile = signal(false);
  private readonly _isTablet = signal(false);
  private readonly _isCompactNavigation = signal(false);
  private readonly _isDrawerNavigation = signal(false);
  private readonly _isTouchLayout = signal(false);

  /** Under 768px: phones and small tablets. Only the essential content and actions. */
  readonly isMobile: Signal<boolean> = this._isMobile.asReadonly();
  /** 768 to 1023px: tablet portrait. Drawer navigation and one or two columns. */
  readonly isTablet: Signal<boolean> = this._isTablet.asReadonly();
  /** Under 1280px: compact navigation, and side panels such as the app launcher become overlays. */
  readonly isCompactNavigation: Signal<boolean> = this._isCompactNavigation.asReadonly();
  /** Under 1024px: the left navigation is a drawer. */
  readonly isDrawerNavigation: Signal<boolean> = this._isDrawerNavigation.asReadonly();
  /** The main input is touch (tablets): bigger targets and no actions that need hover. */
  readonly isTouchLayout: Signal<boolean> = this._isTouchLayout.asReadonly();

  constructor() {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    this.watch('(max-width: 767px)', this._isMobile);
    this.watch('(min-width: 768px) and (max-width: 1023px)', this._isTablet);
    this.watch('(max-width: 1279px)', this._isCompactNavigation);
    this.watch('(max-width: 1023px)', this._isDrawerNavigation);
    this.watch('(pointer: coarse)', this._isTouchLayout);

    // Put the device type (computer or touch device) as classes on <html>, so stylesheets can use it
    // without TypeScript, for example `.touch-layout .row-action { gap: 8px }`.
    effect(() => {
      const c = document.documentElement.classList;
      c.toggle('touch-layout', this._isTouchLayout());
      c.toggle('is-mobile', this._isMobile());
      c.toggle('is-tablet', this._isTablet());
      c.toggle('compact-navigation', this._isCompactNavigation());
    });
  }

  private watch(query: string, target: ReturnType<typeof signal<boolean>>): void {
    const mq = window.matchMedia(query);
    target.set(mq.matches);
    mq.addEventListener('change', (e) => this.zone.run(() => target.set(e.matches)));
  }
}
