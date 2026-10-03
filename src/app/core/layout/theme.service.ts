import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'stowell.theme';
const SYNCFUSION_BASE = 'https://cdn.syncfusion.com/ej2/34.2.6/';

/**
 * Light and dark theme. The browser remembers the choice (the system setting is the default). It's
 * set as `data-theme` on <html> for the CSS variables in styles.scss, and it swaps the Syncfusion
 * stylesheet (`<link id="ej2-theme">` in index.html) so grids, calendars and charts match.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.initial());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      const link = document.getElementById('ej2-theme') as HTMLLinkElement | null;
      if (link) link.href = `${SYNCFUSION_BASE}${t === 'dark' ? 'bootstrap5-dark' : 'bootstrap5'}.css`;
    });
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage isn't available, so the choice just isn't remembered */
    }
  }

  private initial(): Theme {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* fall through to the system setting */
    }
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
