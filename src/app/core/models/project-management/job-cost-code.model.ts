// The cost code dropdown on the PO Request and CO Request forms, in place of a free-text Item. It
// lists only the job's budget lines and carries the Remaining Budget, which fills in automatically
// and is read-only, as the mockup says.
export interface JobCostCodeOption {
  costCode: number;
  costCodeDescription: string;
  budget: number;
  toDate: number;
  remaining: number;
  // Built in the app as "{costCode} - {costCodeDescription}" for the dropdown, matching the
  // mockup's "1000 - Cost Code Description".
  display?: string;
}
