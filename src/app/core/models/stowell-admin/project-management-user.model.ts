// Matches Models/ProjectManagementUser.cs: one row per job, employee and role, as returned by
// GetProjectEmails and sent to InsertProjectManagementUser.
//
// The C# class also has UI-only fields (IsNew, SelectedUserId, SelectedRoleId, Assignments) so one
// type could be a saved row, a project group and an add-row form. They never go through the API, so
// they're left out here and admin-panel.component.ts keeps that state itself. Same behaviour, just
// organised differently.
export interface ProjectManagementUser {
  id: number;
  jobNumber: number;
  emailId: string;
  userRole: number;
  dateAdded: string; // ISO date string over the wire
  isDisabled?: boolean | null;
  userRoleName: string;
}
