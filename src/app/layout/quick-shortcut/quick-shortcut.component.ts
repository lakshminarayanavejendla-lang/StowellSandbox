import { Component } from '@angular/core';

/**
 * Single shared version of the "Quick Shortcut" app-launcher dropdown. The Blazor source had
 * this duplicated three times (MainLayout.razor's topbar, NavMenu.razor's icon-toolbar, and a
 * third near-identical standalone QuickShortcut.razor component that nothing referenced) -
 * consolidated here into one component so MainLayout and NavMenu can both just <app-quick-shortcut>.
 * Confirm whether NavMenu's toolbar copy is still meant to be shown at all before wiring it back in;
 * it looked like leftover/dead duplication rather than an intentional second launcher.
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
