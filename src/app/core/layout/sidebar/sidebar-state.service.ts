import { Injectable, signal } from '@angular/core';

const AUTO_HIDE_KEY = 'stowell.sidebar.autoHide';
const COLLAPSED_KEY = 'stowell.sidebar.collapsed';

/**
 * Sidebar preference shared by the sidebar (pin button), the top bar (menu button) and the shell.
 * Auto-hide: the sidebar stays out of the way, the menu button opens it over the page, and choosing a section closes it again.
 * The choice is remembered per browser.
 */
@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  readonly autoHide = signal(this.read());

  /** Icons only: the sidebar narrows to a rail. Remembered per browser. */
  readonly collapsed = signal(this.readKey(COLLAPSED_KEY));

  toggleCollapsed(): void {
    const on = !this.collapsed();
    this.collapsed.set(on);
    try {
      localStorage.setItem(COLLAPSED_KEY, on ? '1' : '0');
    } catch {
      /* storage isn't available, so the choice just isn't remembered */
    }
  }

  toggleAutoHide(): void {
    const on = !this.autoHide();
    this.autoHide.set(on);
    try {
      localStorage.setItem(AUTO_HIDE_KEY, on ? '1' : '0');
    } catch {
      /* storage isn't available, so the choice just isn't remembered */
    }
  }

  private read(): boolean {
    return this.readKey(AUTO_HIDE_KEY);
  }

  private readKey(key: string): boolean {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }
}
