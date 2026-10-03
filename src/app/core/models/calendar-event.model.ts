// Matches MyEventViewModel, which the Blazor calendar page defined in its @code block.
export interface MyEventViewModel {
  subject: string;
  start: string; // ISO date string over the wire; convert to Date in the component
  end: string;
  organizer?: string;
  isAllDay?: boolean;
}
