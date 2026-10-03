// The job access audit trail, a new feature with no Blazor version. Stored in dbo.JobAccessLog (see
// job-access-log.service.ts and JobAccessController.cs).
export interface JobAccessLogRecord {
  id: number;
  jobId: string;
  jobName: string;
  userEmail: string;
  accessTime: string;
}
