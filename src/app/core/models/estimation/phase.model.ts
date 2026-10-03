// Matches Phase in DTO/CodeCodeSummaryRecord.cs: the master list of phases from
// CostCodeService.GetAllPhases() (api/CostCode/GetAllPhases). It fills the Phase dropdown in the
// Additional Phases popup (PhaseName as text, PhaseNum as value).
//
// The bid form has two other "phase" ideas, kept separate on purpose: EstimationBidPhase, the row
// saved for a job once a phase is picked, and the Job Phase field (RFI, Estimate, Bid, Project), a
// fixed list unrelated to this one.
export interface Phase {
  recnum: string;
  phaseNum: string;
  phaseName: string;
  source?: string;
  email?: string;
}
