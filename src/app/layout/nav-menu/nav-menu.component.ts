import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive,
  NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface SubItem {
  label: string;
  route?: string;
}
interface MenuItem {
  key: string;
  label: string;
  icon: string;
  color: string; // per-module icon color, matched to the production dashboard's scheme
  route?: string; // navigates when the toggle itself is clicked, mirrors NavMenu's ToggleMenu(name, url)
  children?: SubItem[];
}

// Direct port of NavMenu.razor's link list and ToggleMenu/ToggleSubMenu state machine.
// Icon colors sampled from the production dashboard (stowelldashboard.proserv360.tech) via
// computed styles, so the left nav matches it instead of every icon inheriting flat white/navy.
const MENU: MenuItem[] = [
  { key: 'home', label: 'Stowell Home', icon: 'fas fa-house', color: '#007bff', route: '/' },
  {
    key: 'bids',
    label: 'Bid Management',
    // Was the same fa-folder-open as Project Management - indistinguishable at a glance.
    // fa-gavel reads as "bidding" and gives it its own silhouette, not just a different color.
    icon: 'fas fa-gavel',
    color: '#FF5722',
    route: '/bids/current-bids',
    children: [
      { label: 'Bid Queue', route: '/bids/bid-queue' },
      { label: 'New Bid', route: '/bids/new-bid' },
    ],
  },
  {
    key: 'project-mgmt',
    label: 'Project Management',
    icon: 'fas fa-diagram-project',
    color: '#FF9800',
    // FIX (Mike Smith - "These queues should match") - was '/project-management' (a separate
    // Current Jobs page); now the same page as the Project Queue child link below.
    route: '/project-queue',
    children: [
      { label: 'Project Queue', route: '/project-queue' },
      // NEW - Stowell PO Module (see po-queue.component.ts / co-queue.component.ts header
      // comments). Matches the nav order shown in the Moqups design spec's NAV-CO Queue Home
      // page (Project Queue > PO Queue > CO Queue > Budget Configuration).
      { label: 'PO Queue', route: '/project-management/po-queue' },
      { label: 'CO Queue', route: '/project-management/co-queue' },
      { label: 'New PO Form', route: '/project-management/new-po-form' },
      { label: 'New CO Form', route: '/project-management/new-co-form' },
      // NEW - Moqups page FORM-CO Reallocation (Change Order Budget Allocation), link shared
      // 2026-09-13. Route/page/full DB+API stack already existed but had no nav entry - see
      // co-budget-allocation.component.ts header comment.
      { label: 'CO Budget Allocation', route: '/project-management/co-budget-allocation' },
      { label: 'Project Budget Configuration', route: '/project-budget-configuration' },
    ],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    icon: 'fas fa-coins',
    color: '#FFC107',
    route: '/accounting',
    children: [
      // FIX (2026-09-10): was pointed at the New PO Form route instead of the actual queue list.
      { label: 'PO Queue', route: '/project-management/po-queue' },
      { label: 'CO Queue' },
      { label: 'PO Dashboard' },
      { label: 'Project Budget' },
    ],
  },
  { key: 'hr', label: 'HR', icon: 'fas fa-users', color: '#8BC34A', route: '/hr' },
  // FIX (2026-09-16, Mike Smith) - "for now remove Biz Ops from left navigation". Routes/pages
  // themselves are untouched, just no longer linked from the nav - re-add this block to bring it
  // back.
  // {
  //   key: 'bizops',
  //   label: 'BizOps',
  //   icon: 'fas fa-cogs',
  //   color: '#607D8B',
  //   route: '/bi-reports',
  //   children: [
  //     { label: 'BI Reports', route: '/bi-reports' },
  //     { label: 'SysOps', route: '/sys-ops' },
  //     { label: 'DevOps', route: '/dev-ops' },
  //     { label: 'Vendor Management', route: '/vendor-management' },
  //     { label: 'Compliance', route: '/compliance' },
  //     { label: 'Legal', route: '/legal' },
  //   ],
  // },
  // fa-bar-chart is a Font Awesome 4 class name and doesn't exist in the FA6 build this app
  // loads (see index.html) - it was rendering as an empty box. fa-chart-line is the FA6 icon
  // production actually uses for this item.
  { key: 'reports', label: 'Reports', icon: 'fas fa-chart-line', color: '#673AB7', route: '/reporting-dashboard' },
  { key: 'admin', label: 'Stowell Admin', icon: 'fa-solid fa-user-gear', color: '#E91E63', route: '/stowell-admin' },
  { key: 'contacts', label: 'Contacts', icon: 'fas fa-phone', color: '#009688', route: '/contacts' },
];

@Component({
  selector: 'app-nav-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-menu.component.html',
  styleUrl: './nav-menu.component.scss',
})
export class NavMenuComponent {
  private router = inject(Router);
  menu = MENU;

  openMenu: string | null = null;
  openSubMenu: string | null = null;

  constructor() {

    // Automatically open the correct parent menu
    // whenever the route changes.
    this.router.events
      .pipe(
        filter(
          event => event instanceof NavigationEnd
        )
      )
      .subscribe(() => {

        this.openParentMenuForCurrentRoute();

      });

    // Handle initial page load / refresh
    this.openParentMenuForCurrentRoute();
  }

  /**
   * Opens the parent menu containing
   * the currently active route.
   */
  private openParentMenuForCurrentRoute(): void {

    const currentUrl =
      this.router.url.split('?')[0];

    const activeParent =
      this.menu.find(item =>
        item.children?.some(child =>
          child.route &&
          this.isRouteMatch(
            currentUrl,
            child.route
          )
        )
      );

    if (activeParent) {

      this.openMenu = activeParent.key;

    }
  }

  /**
   * Checks whether the current URL belongs
   * to a submenu route.
   */
  private isRouteMatch(
    currentUrl: string,
    route: string
  ): boolean {

    return (
      currentUrl === route ||
      currentUrl.startsWith(route + '/')
    );
  }

  /**
   * Parent menu click.
   */
  toggleMenu(item: MenuItem): void {
    this.openMenu = this.openMenu === item.key ? null : item.key;
    if (item.route) {
      this.router.navigateByUrl(item.route);
    }
  }

  toggleSubMenu(key: string): void {
    this.openSubMenu = this.openSubMenu === key ? null : key;
  }

  goToPasswordPage(): void {
    window.open('https://stowell.proserv360.tech/RDWeb/Pages/en-US/password.aspx', '_blank');
  }
}
