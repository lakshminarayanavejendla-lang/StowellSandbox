// NEW model - Stowell PO Module (not a Blazor port; designed from the "Stowell PO Module"
// Moqups spec, pages NAV-PO Queue Home / TAB-Job PO Overview). No backend endpoint exists for
// this yet - see po-queue.service.ts's header comment.
export interface PoQueueRecord {
  /** Composite display value as shown in the mockup, e.g. "P220112345 (11 of 24)" or
   *  "P220145676 (Add-on)" - format/parsing of the "(n of m)" suffix is not yet specified. */
  masterJobPoId: string;
  poStatus: string;
  jobName: string;
  pm: string;
}

export interface PoQueueData {
  activePOs: PoQueueRecord[];
  completedPOs: PoQueueRecord[];
}
