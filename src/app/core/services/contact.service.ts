import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactsEndpoints } from '../contacts-endpoints';
import { ContactGroup, ContactGroupMember } from '../models/contacts/contact-group.model';

// Ported from ContactService.cs. Like the C# code, errors return an empty list instead of
// throwing, so the page just shows nothing.
@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  // Kept for the session, so coming back to the page or a tab is instant (a failed load isn't kept)
  private groups$?: Observable<ContactGroup[]>;
  private members = new Map<string, Observable<ContactGroupMember[]>>();

  getAllGroups(): Observable<ContactGroup[]> {
    return (this.groups$ ??= this.http.get<ContactGroup[]>(`${this.base}${ContactsEndpoints.GetAllGroupsUrl}`).pipe(
      catchError(() => {
        this.groups$ = undefined;
        return of([]);
      }),
      shareReplay(1)
    ));
  }

  getGroupUsers(groupId: string): Observable<ContactGroupMember[]> {
    let cached = this.members.get(groupId);
    if (!cached) {
      cached = this.http.get<ContactGroupMember[]>(`${this.base}${ContactsEndpoints.GetGroupUsersUrl}/${groupId}`).pipe(
        catchError(() => {
          this.members.delete(groupId);
          return of([]);
        }),
        shareReplay(1)
      );
      this.members.set(groupId, cached);
    }
    return cached;
  }

  private photos = new Map<string, Observable<string | null>>();

  /** A person's photo as an object URL, or null when they have none. Kept for the session. */
  getPhoto(userId: string): Observable<string | null> {
    let cached = this.photos.get(userId);
    if (!cached) {
      cached = this.http.get(`${this.base}${ContactsEndpoints.UserPhotoUrl}/${userId}`, { responseType: 'blob' }).pipe(
        map((blob) => URL.createObjectURL(blob)),
        catchError(() => of(null)),
        shareReplay(1)
      );
      this.photos.set(userId, cached);
    }
    return cached;
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
