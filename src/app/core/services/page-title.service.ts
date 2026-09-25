import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

const APP_NAME = 'Stowell App';

/**
 * NEW - sets the browser tab title from each route's `data.title` on every navigation.
 *
 * Every route in this app already carries a `data: { title: '...' }` value (see the *.routes.ts
 * files under pages/**), but nothing ever read it: no `Title` service call and no Angular
 * `TitleStrategy` were registered anywhere, so `document.title` stayed frozen at index.html's
 * static "Stowell App" on every single page. This walks the activated route tree down to its
 * deepest child (so a child route's title overrides its parent's, matching how nested routes are
 * expected to behave) and pushes it through the `Title` service as "<page title> - Stowell App".
 *
 * NOT implemented as an Angular `TitleStrategy` (the framework-native mechanism, registered via
 * `provide: TitleStrategy`) because that reads a route's native `title` property, not
 * `data.title`. Converting all ~60 routes across 8 *.routes.ts files to the native property -
 * several of which mix `title` with sibling `data` keys like `mode` - would be a much larger,
 * riskier diff for the identical user-visible result. This reads the exact convention already in
 * use everywhere else in the app.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private router = inject(Router);
  private titleService = inject(Title);

  /** Call once, from AppComponent.ngOnInit(). */
  init(): void {
    // FIX - `Router.events` is a plain (hot) Subject, not a ReplaySubject: the very first page
    // load's NavigationEnd can fire - and be lost - before this subscription is set up, since
    // Angular's initial navigation isn't guaranteed to happen after AppComponent.ngOnInit runs.
    // Verified: without this, every page kept the static "Stowell App" title on a fresh load/
    // deep link and only started updating from the *second* navigation onward. Applying the
    // current snapshot immediately covers the case where navigation already completed; the
    // subscription below covers every navigation after that (including the case where it hasn't
    // completed yet at call time - deepestTitle() then returns undefined, applies the default,
    // and the subscription corrects it once the first NavigationEnd does arrive).
    this.applyTitle();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => this.applyTitle());
  }

  private applyTitle(): void {
    const title = this.deepestTitle(this.router.routerState.snapshot.root);
    this.titleService.setTitle(title ? `${title} - ${APP_NAME}` : APP_NAME);
  }

  /** Walks to the deepest activated child, returning its `data.title` (or the nearest ancestor's,
   * if the deepest child doesn't set its own - e.g. a layout route with no title of its own). */
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
