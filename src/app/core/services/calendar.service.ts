import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GlobalEndpoints } from '../global-endpoints';
import { MyEventViewModel } from '../models/calendar-event.model';

// Port of Services/CalendarApiClient.cs.
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getUserCalendar(email: string): Observable<MyEventViewModel[]> {
    console.log(`Fetching calendar events for email: ${email} from ${this.base}${GlobalEndpoints.GetCalendarEventsUrl}`);
    return this.http
      .get<MyEventViewModel[]>(`${this.base}${GlobalEndpoints.GetCalendarEventsUrl}`, {
        params: { email },
      })
      .pipe(catchError(() => of([])));
  }
}
