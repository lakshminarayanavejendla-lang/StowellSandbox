// PO module, built from the Moqups design (pages NAV-PO Queue Home and TAB-Job PO Overview), not
// ported from Blazor. See po-queue.service.ts for where the data comes from.
export interface PoQueueRecord {
  /** The value as the mockup shows it, such as "P220112345 (11 of 24)" or "P220145676 (Add-on)".
   *  How the "(n of m)" part is built isn't decided yet. */
  masterJobPoId: string;
  poStatus: string;
  jobName: string;
  pm: string;
}

export interface PoQueueData {
  activePOs: PoQueueRecord[];
  completedPOs: PoQueueRecord[];
}
