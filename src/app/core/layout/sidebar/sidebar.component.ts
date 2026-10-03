import { Component, computed, inject, input, output } from '@angular/core';
import { NavMenuComponent } from '../../../layout/nav-menu/nav-menu.component';
import { SidebarStateService } from './sidebar-state.service';
import { ThemeService } from '../theme.service';

/**
 * The left sidebar. It changes with screen width:
 *   1280px and up   full sidebar with logo, profile and labelled menu
 *   1024 to 1279    icon-only rail; child links open in a flyout
 *   below 1024      a drawer opened from the top bar's menu button (`open`)
 * With auto-hide on, it's a drawer at every width: the menu button opens it and picking a section
 * closes it. The layout is all CSS; `open` only adds the class that slides the drawer in.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NavMenuComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly state = inject(SidebarStateService);
  private theme = inject(ThemeService);

  /** White logo on the dark sidebar, dark logo on the light one. */
  readonly logoSrc = computed(() => (this.theme.theme() === 'dark' ? 'assets/images/stowell-logo-white.png' : 'assets/images/stowell-home-logo.png'));

  /** Whether the drawer is open. Only matters when the sidebar is a drawer. */
  readonly open = input(false);
  readonly profileName = input('');
  readonly profileRole = input('');
  readonly photoUrl = input('');
  /** A menu link was picked, so the shell closes the drawer. */
  readonly linkClicked = output<void>();

  onClick(event: Event): void {
    if ((event.target as HTMLElement).closest('a')) this.linkClicked.emit();
  }
}
