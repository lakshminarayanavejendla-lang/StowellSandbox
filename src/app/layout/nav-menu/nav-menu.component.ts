import { Component, HostListener, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive,
  NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface SubItem {
  label: string;
  route?: string;
  /** Indent under the link above it: 1 for one step, 2 for two. */
  level?: 1 | 2;
}
interface MenuItem {
  key: string;
  /** A small section label shown above this item. */
  group?: string;
  label: string;
  icon: string;
  color: string; // per-module icon color, matched to the production dashboard's scheme
  route?: string; // navigates when the toggle itself is clicked, mirrors NavMenu's ToggleMenu(name, url)
  children?: SubItem[];
}

// The menu from NavMenu.razor, with its open/close behaviour. Each item still carries the icon colour
// from the production dashboard, though the sidebar now draws all icons in one theme colour.
const MENU: MenuItem[] = [
  { key: 'home', group: 'WORKSPACE', label: 'Stowell Home', icon: 'fas fa-house', color: '#007bff', route: '/' },
  // A placeholder for the Opportunity Orchestrator.
  { key: 'opportunities', label: 'Opportunities', icon: 'fas fa-bullseye', color: '#00BCD4', route: '/opps-pipeline' },
  {
    key: 'bids',
    label: 'Bid Management',
    // A gavel, so it doesn't look like Project Management's icon.
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
    // Opens the Project Queue, the same page as the first link below (Mike Smith: "These queues should match").
    route: '/project-queue',
    children: [
      { label: 'Project Queue', route: '/project-queue' },
      // PO module pages, in the order the Moqups design shows them.
      { label: 'PO Queue', route: '/project-management/po-queue' },
      { label: 'CO Queue', route: '/project-management/co-queue' },
      { label: 'New PO Form', route: '/project-management/new-po-form' },
      { label: 'New CO Form', route: '/project-management/new-co-form' },
      // Change Order Budget Allocation (Moqups page FORM-CO Reallocation, added to the menu 2026-09-13).
      { label: 'CO Budget Allocation', route: '/project-management/co-budget-allocation' },
      // Project configuration is hidden from the menu for now (Mike Smith, 2026-09-26). The page still exists at
      // /project-budget-configuration, and the Budget tab's Set Budget button still opens it.
    ],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    icon: 'fas fa-coins',
    color: '#FFC107',
    route: '/accounting',
    // The Accounting link opens the queue with every approval type; each type also has its own queue below
    // (Mike Smith, 2026-09-26). Project Management keeps separate PO and CO queues.
    children: [
      { label: 'PO Queue', route: '/accounting/po-queue' },
      { label: 'CO Queue', route: '/accounting/co-queue' },
      { label: 'Invoice Queue', route: '/accounting/invoice-queue' },
    ],
  },
  { key: 'hr', group: 'COMPANY', label: 'HR', icon: 'fas fa-users', color: '#8BC34A', route: '/hr' },
  // BizOps is out of the menu for now (Mike Smith, 2026-09-16). Its pages still work; uncomment this
  // block to bring the menu back.
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
  // fa-chart-line, as in production. (The older fa-bar-chart doesn't exist in Font Awesome 6.)
  {
    key: 'reports',
    label: 'Reports',
    icon: 'fas fa-chart-line',
    color: '#673AB7',
    route: '/reporting-dashboard',
    // "All reports" is needed because the drawer menu only expands a section when you click its name.
    children: [
      { label: 'All reports', route: '/reporting-dashboard' },
      // The reports inside it (Statement of Income, Backlog and so on) are tabs on that page.
      { label: 'Monthly Financials', route: '/reporting-dashboard/monthly-financials' },
    ],
  },
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
  /** The menu is a drawer with full labels: a parent only expands, and picking a page navigates and closes the drawer. */
  readonly expandOnly = input(false);
  /** The icon-only rail, chosen with the collapse button (on top of the width-based rail). */
  readonly collapsed = input(false);
  private router = inject(Router);
  menu = MENU;

  /** In the icon rail a module's pages open as a flyout, which closes after a pick or a click elsewhere. */
  private get flyout(): boolean {
    return this.collapsed() && !this.expandOnly();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    if (!this.flyout || !this.openMenu) return;
    const t = e.target as HTMLElement;
    if (!t.closest('.menu-toggle')) this.openMenu = null;
  }

  /** Whether the page you are on belongs to this module, so its parent can be highlighted. */
  isCurrent(item: MenuItem): boolean {
    const url = this.router.url.split('?')[0];
    const routes = [item.route, ...(item.children?.map((c) => c.route) ?? [])].filter((r): r is string => !!r && r !== '/');
    return routes.some((r) => this.isRouteMatch(url, r));
  }

  openMenu: string | null = null;
  openSubMenu: string | null = null;

  constructor() {

    // Open the right parent menu whenever the route changes.
    this.router.events
      .pipe(
        filter(
          event => event instanceof NavigationEnd
        )
      )
      .subscribe(() => {

        this.openParentMenuForCurrentRoute();

      });

    // And on the first load or a refresh.
    this.openParentMenuForCurrentRoute();
  }

  /** Opens the parent menu that holds the current route. */
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

    if (this.flyout) return;

    if (activeParent) {

      this.openMenu = activeParent.key;
      return;

    }

    // Going to a top-level page with no submenu (Home, HR, Reports, Stowell Admin, Contacts) closes the open
    // section, so the menu doesn't keep showing the last section's pages. Pages outside the menu leave it alone.
    const onStandaloneItem = this.menu.some(item =>
      !item.children &&
      item.route &&
      (item.route === '/'
        ? currentUrl === '/'
        : this.isRouteMatch(currentUrl, item.route))
    );

    if (onStandaloneItem) {

      this.openMenu = null;

    }
  }

  /** Whether the current URL is one of this item's submenu routes. */
  private isRouteMatch(
    currentUrl: string,
    route: string
  ): boolean {

    return (
      currentUrl === route ||
      currentUrl.startsWith(route + '/')
    );
  }

  /** A parent menu was clicked. */
  toggleMenu(item: MenuItem): void {
    this.openMenu = this.openMenu === item.key ? null : item.key;
    // In a drawer the parent only expands; picking one of its pages navigates and closes the drawer.
    if (item.route && !this.expandOnly()) {
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
