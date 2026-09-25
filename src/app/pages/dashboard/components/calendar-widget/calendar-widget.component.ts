import { Component, OnInit, inject,ChangeDetectorRef } from '@angular/core';
import {
  AgendaService,
  DayService,
  EventSettingsModel,
  MonthService,
  ScheduleModule,
  WeekService,
} from '@syncfusion/ej2-angular-schedule';
// NOTE: not fully certain whether `@syncfusion/ej2-angular-schedule` re-exports a `View` union
// type (vs. it only living in the underlying `@syncfusion/ej2-schedule` core package) at 27.1.48
// - using plain `string`/`string[]` for `views`/`currentView` below to avoid guessing at an
// import that might not resolve; Syncfusion's `[views]`/`[currentView]` inputs are documented to
// accept plain view-name strings ('Day' | 'Week' | 'Month' | 'Agenda' | ...) either way.
import { CalendarService } from '../../../../core/services/calendar.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MyEventViewModel } from '../../../../core/models/calendar-event.model';

// Syncfusion Schedule's default event field names (Id, Subject, StartTime, EndTime) - the
// original MyEventViewModel has no Id, so one is synthesized from array index below. `Organizer`
// is not one of Schedule's recognized default fields (it doesn't map to a "resource" either), so
// it rides along on the object but is NOT shown anywhere by default - a custom `eventTemplate`
// would be needed to surface it in the UI, which was not attempted here; flagging as a visible
// behavior regression vs. the old agenda widget (which always showed the organizer).
interface ScheduleEventData {
  Id: number;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  Organizer?: string;
}

/**
 * Port of Dashboard.razor's RadzenScheduler widget (RadzenMonthView/RadzenWeekView/RadzenDayView).
 * Previously a lightweight hand-built agenda-list placeholder standing in for Radzen's paid
 * Angular scheduler; now a real Syncfusion `ejs-schedule` (ScheduleComponent) with Day/Week/Month
 * views mirroring the original RadzenScheduler view set, plus Agenda (a Syncfusion list view)
 * added as a closer replacement for the old widget's "List" toggle mode. `Dashboard.razor`'s
 * original markup wasn't available locally to confirm the exact default view/height RadzenScheduler
 * used - defaulted to `currentView = 'Month'` as a reasonable guess; adjust if the real Blazor
 * source specifies differently.
 */
@Component({
  selector: 'app-calendar-widget',
  standalone: true,
  imports: [ScheduleModule],
  // Day/Week/Month/Agenda services must each be registered here - Syncfusion Angular Schedule
  // views are opt-in via Angular DI, matching the `views` array passed to the template below.
  providers: [DayService, WeekService, MonthService, AgendaService],
  templateUrl: './calendar-widget.component.html',
  styleUrl: './calendar-widget.component.scss',
})
export class CalendarWidgetComponent implements OnInit {
  private calendarService = inject(CalendarService);
  private authService = inject(AuthService);

  eventSettings: EventSettingsModel = { dataSource: [] };
  views: string[] = ['Day', 'Week', 'Month', 'Agenda'];
  currentView = 'Month';

  ngOnInit(): void {
  // Auth is wired now - use the signed-in user's own calendar instead of the hardcoded
  // HR mailbox (which only ever had a handful of birthday events, none in the current month).
  const eventsEmail = this.authService.getLoggedInUserEmail() ?? 'hr@stowellinc.com';
  this.calendarService.getUserCalendar(eventsEmail).subscribe({
    next: (events) => {
      console.log('Calendar API response:', events);

      // this.eventSettings = {
      //   dataSource: this.toScheduleEvents(events)
      // };
 const scheduleEvents = this.toScheduleEvents(events);

      console.log('Schedule events:', scheduleEvents);

      this.eventSettings = {
        dataSource: [...scheduleEvents]
      };
//       this.eventSettings= {
//   dataSource: [
//     {
//       Id: 1,
//       Subject: 'TEST EVENT',
//       StartTime: new Date(2026, 7, 13, 10, 0),
//       EndTime: new Date(2026, 7, 13, 11, 0),
//       Title: 'TEST EVENT',
//     }
//   ]
// };
      console.log('Schedule events:', this.eventSettings.dataSource);
      this.cdr.detectChanges(); // Trigger change detection to update the view
    },
    error: (error) => {
      console.error('Calendar API error:', error);
    }
  });
}

private toScheduleEvents(events: MyEventViewModel[]): ScheduleEventData[] {
  console.log('Fetched Calendar Events:', events);

  return events.map((e, i) => ({
    Id: i + 1,
    Subject: e.subject,
    StartTime: new Date(e.start),
    EndTime: new Date(e.end),
    Organizer: e.organizer
  }));
}
  constructor(
  private cdr: ChangeDetectorRef,
  ) {}
}
