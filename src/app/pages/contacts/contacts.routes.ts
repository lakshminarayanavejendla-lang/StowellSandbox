import { Routes } from '@angular/router';

/**
 * Contacts routes, imported in app.routes.ts as CONTACTS_ROUTES.
 *
 * Blazor used /Contacts. It's 'contacts' here to match the other lowercase routes such as
 * 'project-management'. The Contacts menu link in NavMenu.razor had no href, so point it here.
 */
export const CONTACTS_ROUTES: Routes = [
  { path: 'contacts', loadComponent: () => import('./contacts-directory/contacts-directory.component').then((m) => m.ContactsDirectoryComponent), data: { title: 'Contacts' } },
];
