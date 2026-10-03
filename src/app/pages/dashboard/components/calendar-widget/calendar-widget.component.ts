import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CalendarService } from '../../../../core/services/calendar.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MyEventViewModel } from '../../../../core/models/calendar-event.model';

interface CalEvent {
  key: string;
  start: Date;
  time: string;
  title: string;
  who: string;
}

interface DayCell {
  key: string;
  day: number;
  outside: boolean;
  today: boolean;
  hasEvents: boolean;
}

const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * Calendar widget: a month of rounded day tiles (a dot marks days that have events) and the agenda for the chosen day.
 * Events come from the shared calendar (CalendarService); "Add event" saves a new one to it through the API.
 */
@Component({
  selector: 'app-calendar-widget',
  standalone: true,
  templateUrl: './calendar-widget.component.html',
  styleUrl: './calendar-widget.component.scss',
})
export class CalendarWidgetComponent implements OnInit {
  private calendarService = inject(CalendarService);
  private authService = inject(AuthService);

  readonly today = new Date();
  readonly weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  /** first day of the month being shown */
  readonly month = signal(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
  readonly selected = signal(dateKey(this.today));
  private readonly events = signal<CalEvent[]>([]);

  readonly title = computed(() => this.month().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

  private readonly eventDays = computed(() => new Set(this.events().map((e) => e.key)));

  readonly cells = computed<DayCell[]>(() => {
    const m = this.month();
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const lead = first.getDay();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    const withEvents = this.eventDays();
    const todayKey = dateKey(this.today);

    return Array.from({ length: total }, (_, i) => {
      const d = new Date(m.getFullYear(), m.getMonth(), 1 - lead + i);
      const key = dateKey(d);
      return { key, day: d.getDate(), outside: d.getMonth() !== m.getMonth(), today: key === todayKey, hasEvents: withEvents.has(key) };
    });
  });

  readonly agenda = computed(() =>
    this.events()
      .filter((e) => e.key === this.selected())
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
  );

  readonly selectedLabel = computed(() => {
    const [y, m, d] = this.selected().split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  });

  // ---- Add event ----
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly form = signal({ title: '', date: '', allDay: false, start: '09:00', end: '10:00' });

  openForm(): void {
    const [y, m, d] = this.selected().split('-').map(Number);
    this.form.set({ title: '', date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, allDay: false, start: '09:00', end: '10:00' });
    this.formError.set('');
    this.formOpen.set(true);
  }

  @HostListener('document:keydown.escape')
  closeForm(): void {
    if (!this.saving()) this.formOpen.set(false);
  }

  setField(field: 'title' | 'date' | 'start' | 'end', value: string): void {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  setAllDay(checked: boolean): void {
    this.form.update((f) => ({ ...f, allDay: checked }));
  }

  save(): void {
    const f = this.form();
    if (!f.title.trim()) return this.formError.set('Enter a title.');
    if (!f.date) return this.formError.set('Choose a date.');

    const [y, m, d] = f.date.split('-').map(Number);
    let start: Date;
    let end: Date;
    if (f.allDay) {
      // all-day events run midnight to midnight (UTC), which is what the calendar service expects
      start = new Date(Date.UTC(y, m - 1, d));
      end = new Date(Date.UTC(y, m - 1, d + 1));
    } else {
      const [sh, sm] = f.start.split(':').map(Number);
      const [eh, em] = f.end.split(':').map(Number);
      start = new Date(y, m - 1, d, sh, sm);
      end = new Date(y, m - 1, d, eh, em);
      if (end <= start) return this.formError.set('The end time must be after the start time.');
    }

    this.saving.set(true);
    this.formError.set('');
    this.calendarService.createEvent(f.title.trim(), start, end, f.allDay).subscribe({
      next: (created) => {
        this.events.update((list) => [...list, this.toEvent({ ...created, subject: created?.subject || f.title.trim(), start: start.toISOString(), end: end.toISOString(), isAllDay: f.allDay })]);
        this.selected.set(dateKey(new Date(y, m - 1, d)));
        this.month.set(new Date(y, m - 1, 1));
        this.saving.set(false);
        this.formOpen.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? err?.error?.Message ?? 'The event could not be saved. Please try again.');
      },
    });
  }

  ngOnInit(): void {
    // the signed-in user's own calendar (falls back to the configured mailbox if there is no signed-in account)
    const email = this.authService.getLoggedInUserEmail() ?? 'hr@stowellinc.com';
    this.calendarService.getUserCalendar(email).subscribe((events) => this.events.set(events.map((e) => this.toEvent(e))));
  }

  shift(months: number): void {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + months, 1));
  }

  goToday(): void {
    this.month.set(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
    this.selected.set(dateKey(this.today));
  }

  select(cell: DayCell): void {
    this.selected.set(cell.key);
    // picking a greyed-out day from a neighbouring month moves to that month
    if (cell.outside) {
      const [y, m] = cell.key.split('-').map(Number);
      this.month.set(new Date(y, m - 1, 1));
    }
  }

  private toEvent(e: MyEventViewModel): CalEvent {
    const start = new Date(e.start);
    // an all-day event is a calendar date, not an instant: read its date in UTC so it does not slide to the previous day
    const allDay = !!e.isAllDay;
    const key = allDay ? `${start.getUTCFullYear()}-${start.getUTCMonth() + 1}-${start.getUTCDate()}` : dateKey(start);
    return {
      key,
      start,
      time: allDay ? 'All day' : start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      title: e.subject || '(No title)',
      who: e.organizer ?? '',
    };
  }
}
