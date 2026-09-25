// Job access audit trail (new feature, not a Blazor port). Backed by dbo.JobAccessLog - see
// job-access-log.service.ts / JobAccessController.cs.
export interface JobAccessLogRecord {
  id: number;
  jobId: string;
  jobName: string;
  userEmail: string;
  accessTime: string;
}
