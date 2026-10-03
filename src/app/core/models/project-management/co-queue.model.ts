// PO module, built from the Moqups design (page NAV-CO Queue Home), not ported from Blazor. There's
// no API for this yet (see co-queue.service.ts).
export interface CoQueueRecord {
  /** The value as the mockup shows it, such as "C220112345 (11 of 24)" or "C220145676 (Add-on)". */
  masterJobCoId: string;
  // The mockup labels this column "PO Status", not "CO Status". Probably copied from the PO Queue
  // page, but kept as designed.
  poStatus: string;
  jobName: string;
  pm: string;
  /** Set only when the row is also a CO Budget Allocation (CO_GetQueueData joins
   *  dbo.CoBudgetAllocations on CoNumber = chgnum); null for a plain Sage CO. Decides which edit page
   *  the "Master Job CO ID" link opens (see co-queue.component.html). */
  allocationId: number | null;
}

export interface CoQueueData {
  activeCOs: CoQueueRecord[];
  completedCOs: CoQueueRecord[];
}
