// NEW - Stowell PO/CO Module. Backs the Phase dropdown on FORM-CO Reallocation (Change Order
// Budget Allocation), replacing free-text Phase entry with a real dropdown scoped to the
// selected job's actual Sage phases (StowellSandbox.dbo.jobphs).
export interface JobPhaseOption {
  phaseNumber: number;
  phaseName: string;
}
