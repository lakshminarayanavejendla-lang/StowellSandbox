// NEW model - Stowell PO Module (not a Blazor port; designed from the "Stowell PO Module"
// Moqups spec, page NAV-CO Queue Home). No backend endpoint exists for this yet - see
// co-queue.service.ts's header comment.
export interface CoQueueRecord {
  /** Composite display value as shown in the mockup, e.g. "C220112345 (11 of 24)" or
   *  "C220145676 (Add-on)". */
  masterJobCoId: string;
  // FLAG: the mockup's NAV-CO Queue Home page literally labels this column "PO Status", not "CO
  // Status" - preserved as-is (looks like a copy/paste artifact from the PO Queue page in the
  // source design), not silently corrected.
  poStatus: string;
  jobName: string;
  pm: string;
  /** Set only when this row is also a CO Budget Allocation submission (CO_GetQueueData LEFT
   *  JOINs dbo.CoBudgetAllocations on CoNumber = chgnum) - null for a plain Sage CO. Drives which
   *  edit page the "Master Job CO ID" link goes to; see co-queue.component.html. */
  allocationId: number | null;
}

export interface CoQueueData {
  activeCOs: CoQueueRecord[];
  completedCOs: CoQueueRecord[];
}
