import { Routes } from '@angular/router';
import { ContactsDirectoryComponent } from './contacts-directory/contacts-directory.component';

/**
 * Contacts module routes - merged into app.routes.ts's children array by whoever owns that file
 * (per this phase's collision-avoidance rules, this file does not edit app.routes.ts directly -
 * it's already imported there as `CONTACTS_ROUTES`).
 *
 * Route path: the real Blazor source is `@page "/Contacts"` (Components/Pages/Contacts/Index.razor)
 * - lowercased here to 'contacts' to match this app's existing kebab-case/lowercase route
 * convention (e.g. 'project-management', 'accounting'). NavMenu.razor's "Contacts" nav link has
 * no `href` in the source (a dead link, per this phase's task brief) - there was no Phase 1
 * placeholder path reserved for this module. Flagging 'contacts' as the path to wire the nav
 * link to, since nothing else in the app currently points at it.
 */
export const CONTACTS_ROUTES: Routes = [
  { path: 'contacts', component: ContactsDirectoryComponent, data: { title: 'Contacts' } },
];
