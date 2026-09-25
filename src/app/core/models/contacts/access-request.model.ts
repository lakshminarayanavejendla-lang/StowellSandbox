// Port of StowellCoApp.DTO.AccessRequest / UserGroup (DTO/AccessRequest.cs) - CONFIRMED field
// shapes (read directly from source), but FLAGGED AS ORPHANED: no Razor page, code-behind, or
// service in this codebase (ContactService.cs, StowellAdminService.cs, or any other *Service.cs
// found) actually references `AccessRequest` or `UserGroup`. They are not used by
// Contacts/Index.razor + IndexBase.razor.cs (the only real Contacts page in this app - it only
// ever touches ContactGroups/ContactGroupMembers). Kept here as a straight model port per the
// task's DTO list, but NOT wired into any component, service, or route - there is no evidence of
// an "access request" UI anywhere in the Blazor source to port. If a real access-request/branch
// manager approval feature exists in a part of the source not included in this handoff, confirm
// its page/service before building UI against this shape.
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
