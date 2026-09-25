import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactsEndpoints } from '../contacts-endpoints';
import { ContactGroup, ContactGroupMember } from '../models/contacts/contact-group.model';

// Port of IContactService/ContactService.cs. Both methods in the C# source swallow all errors
// and return an empty array/list rather than throwing (try/catch around GetFromJsonAsync,
// logging and returning Array.Empty<T>()) - reproduced here via catchError(() => of([])) to
// match that "never surface an error to the UI, just show empty state" behavior exactly.
@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getAllGroups(): Observable<ContactGroup[]> {
    return this.http
      .get<ContactGroup[]>(`${this.base}${ContactsEndpoints.GetAllGroupsUrl}`)
      .pipe(catchError(() => of([])));
  }

  getGroupUsers(groupId: string): Observable<ContactGroupMember[]> {
    return this.http
      .get<ContactGroupMember[]>(`${this.base}${ContactsEndpoints.GetGroupUsersUrl}/${groupId}`)
      .pipe(catchError(() => of([])));
  }

  getUsersByEmail(emails: string[]): Observable<ContactGroupMember[]> {
    const params = new HttpParams().set('emails', emails.join(','));
    return this.http
      .get<ContactGroupMember[]>(`${this.base}${ContactsEndpoints.GetUsersByEmailUrl}`, { params })
      .pipe(catchError(() => of([])));
  }

  getAllUsers(): Observable<ContactGroupMember[]> {
    return this.http
      .get<ContactGroupMember[]>(`${this.base}${ContactsEndpoints.GetAllUsersUrl}`)
      .pipe(catchError(() => of([])));
  }
}
