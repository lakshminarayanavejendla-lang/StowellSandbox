import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

const APP_NAME = 'Stowell App';

/**
 * Sets the browser tab title to "<page title> - Stowell App" from each route's data.title.
 * The deepest child route wins, so a child page's title replaces its parent's.
 *
 * This isn't an Angular TitleStrategy because that reads a route's own `title` property, and the
 * routes here use data.title. Switching about 60 routes over wasn't worth it for the same result.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private router = inject(Router);
  private titleService = inject(Title);

  /** Call once, from AppComponent.ngOnInit(). */
  init(): void {
    // Router.events doesn't replay, so the first page load's NavigationEnd can happen before we
    // subscribe. Set the title from the current route now, then keep it updated on every navigation.
    this.applyTitle();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => this.applyTitle());
  }

  private applyTitle(): void {
    const title = this.deepestTitle(this.router.routerState.snapshot.root);
    this.titleService.setTitle(title ? `${title} - ${APP_NAME}` : APP_NAME);
  }

  /** The data.title of the deepest active route, or of the nearest parent that has one. */
  private deepestTitle(snapshot: ActivatedRouteSnapshot): string | undefined {
    let current = snapshot;
    let title = current.data['title'] as string | undefined;
    while (current.firstChild) {
      current = current.firstChild;
      title = (current.data['title'] as string | undefined) ?? title;
    }
    return title;
  }
}
