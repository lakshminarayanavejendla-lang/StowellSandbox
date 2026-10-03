import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ViewportService } from './viewport.service';

export type Density = 'comfortable' | 'standard' | 'compact';

const STORAGE_KEY = 'ui-density';
const MODES: Density[] = ['comfortable', 'standard', 'compact'];

/**
 * Screen density:
 *   comfortable  tablets and touch: 48px rows, 44px controls, more padding
 *   standard     the normal laptop layout: 40px rows, nothing overridden
 *   compact      for finance and heavy users: 32px rows, more data on screen
 *
 * The choice is saved to the user's profile on the server (dbo.UserPreferences through
 * /api/UserPreferences), so it follows them to any device. localStorage keeps a quick local copy
 * that's also used when the server can't be reached. With nothing saved, touch devices start in
 * comfortable and everything else in standard. The mode is set as data-density on <html>, and the
 * sizes are in _global-responsive.scss, so components don't need to check it.
 */
@Injectable({ providedIn: 'root' })
export class DensityService {
  private viewport = inject(ViewportService);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly chosen = signal<Density | null>(DensityService.read());

  /** The mode in effect: the user's choice, otherwise the device default. */
  readonly density = computed<Density>(() => this.chosen() ?? (this.viewport.isTouchLayout() ? 'comfortable' : 'standard'));

  constructor() {
    effect(() => {
      if (typeof document !== 'undefined') document.documentElement.setAttribute('data-density', this.density());
    });
  }

  /** Loads the user's saved density from their profile. Call it once the user is known, for example from the main layout. */
  init(): void {
    const email = this.auth.getLoggedInUserEmail();
    if (!email) return;

    this.http
      .get<Record<string, string>>(`${environment.apiBaseUrl}api/UserPreferences/${encodeURIComponent(email)}`)
      .subscribe({
        next: (prefs) => {
          const saved = prefs?.['density'] as Density | undefined;
          if (saved && MODES.includes(saved)) {
            // The profile wins, so the setting follows the user across devices.
            this.chosen.set(saved);
            DensityService.write(saved);
          } else if (this.chosen()) {
            // First sign-in since profiles were added: keep this browser's setting and save it to the profile.
            this.saveToProfile(this.chosen()!);
          }
        },
        error: () => {
          /* the profile couldn't be reached, so the browser's copy is used */
        },
      });
  }

  set(mode: Density): void {
    this.chosen.set(mode);
    DensityService.write(mode);
    this.saveToProfile(mode);
  }

  /** standard, then comfortable, then compact, then back to standard */
  cycle(): void {
    const order: Density[] = ['standard', 'comfortable', 'compact'];
    this.set(order[(order.indexOf(this.density()) + 1) % order.length]);
  }

  private saveToProfile(mode: Density): void {
    const email = this.auth.getLoggedInUserEmail();
    if (!email) return;
    this.http
      .post(`${environment.apiBaseUrl}api/UserPreferences`, { email, key: 'density', value: mode })
      .subscribe({ error: () => { /* saved in this browser; the profile copy is retried on the next change */ } });
  }

  private static read(): Density | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'comfortable' || v === 'standard' || v === 'compact' ? v : null;
    } catch {
      return null;
    }
  }

  private static write(mode: Density): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* storage isn't available (private window or blocked), but the choice still applies for this visit */
    }
  }
}
