// The Phase dropdown on the CO Reallocation form, in place of typing a phase. Lists the job's Sage
// phases (StowellSandbox.dbo.jobphs).
export interface JobPhaseOption {
  phaseNumber: number;
  phaseName: string;
}
