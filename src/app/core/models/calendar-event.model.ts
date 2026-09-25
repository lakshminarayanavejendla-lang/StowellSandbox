// Mirrors MyEventViewModel, defined inline inside CalendarPage.razor's @code block.
export interface MyEventViewModel {
  subject: string;
  start: string; // ISO date string over the wire; convert to Date in the component
  end: string;
  organizer?: string;
}
