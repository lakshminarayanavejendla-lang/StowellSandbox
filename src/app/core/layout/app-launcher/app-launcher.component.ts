import { Component, signal } from '@angular/core';

const KEY = 'stowell.launcher.collapsed';

/**
 * The app launcher on the right (BuzzBID, OST, QuickBid, Sage 100, Outlook, OneDrive, Word, Excel,
 * Corpay). It's a fixed column from 1280px. Below that it's an overlay the top bar's launcher
 * button shows and hides (see app-launcher.component.scss).
 *
 * The icons used to point at https://stowellsandbox.proserv360.tech/img/..., which only existed in
 * the old Blazor app. They're relative paths under assets/images/ now, so they work wherever the
 * app runs (Mike Smith, 2026-09-17: "the Right hand applications do not work").
 */
@Component({
  selector: 'app-launcher',
  standalone: true,
  templateUrl: './app-launcher.component.html',
  styleUrl: './app-launcher.component.scss',
})
export class AppLauncherComponent {
  /** Icons only, without the app names. Remembered per browser. */
  readonly collapsed = signal(this.read());

  toggle(): void {
    const on = !this.collapsed();
    this.collapsed.set(on);
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      /* storage isn't available, so the choice just isn't remembered */
    }
  }

  private read(): boolean {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  }
}
