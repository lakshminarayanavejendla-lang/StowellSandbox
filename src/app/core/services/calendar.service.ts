import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GlobalEndpoints } from '../global-endpoints';
import { MyEventViewModel } from '../models/calendar-event.model';

// Ported from Services/CalendarApiClient.cs.
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /** The calendar goes through Microsoft Graph (about a second), so the result is reused for a minute. */
  private events: { at: number; email: string; stream: Observable<MyEventViewModel[]> } | null = null;

  getUserCalendar(email: string): Observable<MyEventViewModel[]> {
    if (this.events && this.events.email === email && Date.now() - this.events.at < 60_000) return this.events.stream;
    const stream = this.http
      .get<MyEventViewModel[]>(`${this.base}${GlobalEndpoints.GetCalendarEventsUrl}`, {
        params: { email },
      })
      .pipe(catchError(() => of([] as MyEventViewModel[])), shareReplay(1));
    this.events = { at: Date.now(), email, stream };
    return stream;
  }

  /** Adds an event to the shared calendar. Times are sent as ISO (UTC) strings. */
  createEvent(subject: string, start: Date, end: Date, isAllDay: boolean): Observable<MyEventViewModel> {
    return this.http.post<MyEventViewModel>(`${this.base}${GlobalEndpoints.CreateCalendarEventUrl}`, {
      subject,
      start: start.toISOString(),
      end: end.toISOString(),
      isAllDay,
    });
  }
}
