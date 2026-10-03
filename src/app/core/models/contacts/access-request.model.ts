// Matches AccessRequest and UserGroup in DTO/AccessRequest.cs. Nothing in the Blazor app uses them;
// the Contacts page only uses ContactGroups and ContactGroupMembers. They're ported as models only,
// with no page, service or route. If an access request or branch manager approval feature exists
// somewhere we didn't get, check it before building UI on this.
export interface AccessRequest {
  jobNumber: string;
  jobName: string;
  projectManager: string;
  assistantProjectManager: string;
  jobId: number;
  branchManagerGroupId: string;
}

export interface UserGroup {
  name: string;
  id: string;
}
