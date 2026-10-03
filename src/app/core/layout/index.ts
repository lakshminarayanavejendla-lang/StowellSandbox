// The building blocks of the portal shell. Import them from here.
//
//   MainLayoutComponent (app/layout/main-layout) composes:  app-sidebar | app-topbar | app-workspace | app-launcher
//   Every page starts with:                                  app-page-header (title, app-breadcrumb, actions)  ->  app-kpi-cards  ->  content
export { SidebarComponent } from './sidebar/sidebar.component';
export { TopbarComponent } from './topbar/topbar.component';
export { WorkspaceComponent } from './workspace/workspace.component';
export { AppLauncherComponent } from './app-launcher/app-launcher.component';
export { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
export type { Breadcrumb } from './breadcrumb/breadcrumb.component';
export { PageHeaderComponent } from '../../shared/page-header/page-header.component';
export { KpiCardsComponent } from '../../shared/ui/kpi-cards/kpi-cards.component';
export type { KpiItem } from '../../shared/ui/kpi-cards/kpi-cards.component';
export { ResponsiveGridComponent } from '../../shared/ui/responsive-grid/responsive-grid.component';
export { DashboardCardComponent } from '../../shared/ui/dashboard-card/dashboard-card.component';
