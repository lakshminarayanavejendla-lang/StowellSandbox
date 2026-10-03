import { Component } from '@angular/core';

/**
 * The Quick Shortcut app dropdown. Blazor had three copies: in MainLayout.razor's top bar, in
 * NavMenu.razor's icon toolbar, and an unused QuickShortcut.razor. Now there's one component that
 * both places can use as <app-quick-shortcut>. Check whether NavMenu's copy should be shown at all
 * before adding it back; it looked like a leftover rather than a second launcher.
 */
@Component({
  selector: 'app-quick-shortcut',
  standalone: true,
  templateUrl: './quick-shortcut.component.html',
  styleUrl: './quick-shortcut.component.scss',
})
export class QuickShortcutComponent {
  isOpen = false;

  toggle(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  close(): void {
    this.isOpen = false;
  }
}
