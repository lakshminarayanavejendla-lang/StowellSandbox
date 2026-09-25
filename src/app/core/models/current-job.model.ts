// Mirrors StowellCoApp.DTO.CurrentJob as consumed by CurrentJobs.razor / DashboardCurrentJobs.razor.
// Field list inferred from usage (search/filter predicates) - confirm against the actual
// StowellCoAPI response shape before wiring this up for real, the exact CurrentJob C# class
// wasn't found under DTO/Models in the extracted source (see handoff notes).
export interface CurrentJob {
  jobID: string;
  jobName: string;
  address?: string;
  createdBy?: string;
  status?: string;
}
