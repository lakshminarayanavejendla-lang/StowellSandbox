// Port of StowellCoApp.Models.ProjectManagementUser (Models/ProjectManagementUser.cs) - CONFIRMED
// read directly from source. This is the row shape returned by GetProjectEmails/inserted by
// InsertProjectManagementUser: one row per (job, employee, role) assignment.
//
// The C# class also carries several UI-only fields bolted directly onto the persisted DTO
// (IsNew, SelectedUserId, SelectedRoleId, Assignments) so AdminPanelBase.cs could reuse one type
// for both "a saved assignment row" and "the parent project group in the grid" and "an in-progress
// add-row form". Kept those fields OUT of this model - they never round-trip through the API - and
// modeled the grouping/add-row state separately in admin-panel.component.ts instead. This is an
// organizational cleanup only, not a behavior change; flagging per this phase's "document
// inferred-vs-confirmed" convention since it does reshape the original type.
export interface ProjectManagementUser {
  id: number;
  jobNumber: number;
  emailId: string;
  userRole: number;
  dateAdded: string; // ISO date string over the wire
  isDisabled?: boolean | null;
  userRoleName: string;
}
