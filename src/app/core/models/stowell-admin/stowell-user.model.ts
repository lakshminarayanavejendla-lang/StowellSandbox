// Matches Models/StowellUser.cs. Returned by GetAdminPanelUsers().
//
// The Blazor page's call to GetAdminPanelUsers() is commented out. Its Employee dropdown comes from
// ContactService.GetGroupUsers(), a security group lookup (see admin-panel.component.ts). So this
// is unused for now. Ask the team whether it should replace the group lookup or is left over.
export interface StowellUser {
  id: number;
  displayName?: string | null;
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  licenses?: string | null;
  email?: string | null;
  role?: string | null;
}
