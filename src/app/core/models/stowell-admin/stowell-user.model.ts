// Port of StowellCoApp.Models.StowellUser (Models/StowellUser.cs) - CONFIRMED read directly from
// source. Backs AdminPanelService.GetAdminPanelUsers().
//
// FLAG: GetAdminPanelUsers() is called from AdminPanelBase.cs but the call is commented out
// (`// _stowellUsers = await _adminPanelService.GetAdminPanelUsers();`) - the live code instead
// populates the "Employee" dropdown from IContactService.GetGroupUsers() (a security-group
// membership lookup, see admin-panel.component.ts). This model/service method is ported for
// completeness (it's part of IAdminPanelService's real contract) but is currently unused/dead in
// the one page that could call it - confirm with the team whether GetAdminPanelUsers is meant to
// replace the group-membership lookup, or is leftover from an earlier implementation.
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
