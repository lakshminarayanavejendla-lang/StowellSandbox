// Mirrors StowellCoApp.DTO.Phase (confirmed, DTO/CodeCodeSummaryRecord.cs). This is the
// global cost-code "Phase" catalog (e.g. an official phase/cost-code list), fetched via
// CostCodeService.GetAllPhases() (api/CostCode/GetAllPhases) and used to populate the
// "Additional Phases" popup's Phase dropdown (TextProperty=PhaseName, ValueProperty=PhaseNum).
//
// Distinct from `EstimationBidPhase` (the per-job row saved once a phase is picked here) and
// from the single-select "Job Phase" field (RFI/Estimate/Bid/Project, a hardcoded string list,
// unrelated to this catalog) - three different "phase" concepts in the same form, kept
// deliberately separate rather than conflated.
export interface Phase {
  recnum: string;
  phaseNum: string;
  phaseName: string;
  source?: string;
  email?: string;
}
