// Port of the routes StowellAdmin/AdminPanel services actually call. Per this codebase's
// established pattern (see HANDOFF.md), `Common/GlobalEndpoints.cs` only defines SOME of these
// as named constants - the rest are raw string literals inline in the C# service classes. Each
// entry below is annotated with where it actually came from.
export const StowellAdminEndpoints = {
  // CONFIRMED - named constant in Common/GlobalEndpoints.cs (`GetProjectIdsUrl`).
  // FLAG: backs AdminPanelService.GetProjectIds(), but AdminPanelBase.cs never calls this method
  // and no dropdown/grid in AdminPanel.razor consumes CostCodeRecord - appears orphaned. See
  // core/models/stowell-admin/cost-code-record.model.ts for the fuller flag.
  GetProjectIdsUrl: 'api/AdminPanel/GetProjectIds',

  // INFERRED from an inline string literal in AdminPanelService.GetUserRoles() (the C# source
  // even has a commented-out line reusing GetProjectIdsUrl by mistake, then defines
  // `var apiname = "api/AdminPanel/GetUserRoles";` right below it - not in GlobalEndpoints.cs).
  GetUserRolesUrl: 'api/AdminPanel/GetUserRoles',

  // INFERRED from an inline string literal in AdminPanelService.GetAdminPanelUsers().
  // FLAG: this call is commented out in AdminPanelBase.cs
  // (`// _stowellUsers = await _adminPanelService.GetAdminPanelUsers();`) - the live page instead
  // populates the Employee dropdown from IContactService.GetGroupUsers() scoped to a hardcoded
  // security-group id. See admin-panel.service.ts and stowell-user.model.ts for the full flag.
  GetAdminPanelUsersUrl: 'api/AdminPanel/GetAdminPanelUsers',

  // INFERRED from an inline string literal in AdminPanelService.GetProjectEmails(). This is the
  // real data source for the Project Access Management grid (AdminPanelBase.OnAfterRenderAsync).
  GetProjectEmailsUrl: 'api/AdminPanel/GetProjectEmails',

  // INFERRED from an inline string literal in AdminPanelService.InsertProjectManagementUser().
  // SECURITY-RELEVANT: this is the real access-control write - assigns an employee to a project
  // role. See project-role.model.ts and admin-panel.service.ts for the flag on what this endpoint
  // does NOT appear to validate server-side (per the Blazor source alone).
  InsertProjectManagementUserUrl: 'api/AdminPanel/InsertProjectManagementUser',

  // INFERRED from an inline string literal in AdminPanelService.DeleteProjectManagementUser().
  // SECURITY-RELEVANT: revokes a project role assignment.
  DeleteProjectManagementUserUrl: 'api/AdminPanel/DeleteProjectManagementUser',

  // CONFIRMED - named constant in Common/GlobalEndpoints.cs (`GetProcessDisconnectUsersUrl`),
  // matching the task brief's hint exactly. SECURITY-RELEVANT: force-disconnects ALL logged-in
  // users session-wide (StowellAdminService.ProcessDisconnectUsers posts with no body/filter -
  // there is no "disconnect this one user" variant in the source, only "disconnect everyone").
  GetProcessDisconnectUsersUrl: 'api/StowellAdmin/ProcessDisconnectUsers',
} as const;
