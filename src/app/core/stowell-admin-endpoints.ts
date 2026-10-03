// API routes for Stowell Admin and the Admin Panel. Some are constants in GlobalEndpoints.cs and the
// rest are plain strings in the C# services. Each one says where it came from.
export const StowellAdminEndpoints = {
  // GlobalEndpoints.GetProjectIdsUrl. Nothing on the Admin Panel uses it, so it looks unused
  // (see cost-code-record.model.ts).
  GetProjectIdsUrl: 'api/AdminPanel/GetProjectIds',

  // A plain string in AdminPanelService.GetUserRoles(); not in GlobalEndpoints.cs.
  GetUserRolesUrl: 'api/AdminPanel/GetUserRoles',

  // A plain string in AdminPanelService.GetAdminPanelUsers(). The Blazor page doesn't call it; its
  // Employee dropdown comes from GetGroupUsers() for one fixed security group instead
  // (see admin-panel.service.ts and stowell-user.model.ts).
  GetAdminPanelUsersUrl: 'api/AdminPanel/GetAdminPanelUsers',

  // A plain string in AdminPanelService.GetProjectEmails(). Fills the Project Access Management grid.
  GetProjectEmailsUrl: 'api/AdminPanel/GetProjectEmails',

  // A plain string in AdminPanelService.InsertProjectManagementUser(). Security-sensitive: it gives an
  // employee a role on a project. See admin-panel.service.ts for what the server may not check.
  InsertProjectManagementUserUrl: 'api/AdminPanel/InsertProjectManagementUser',

  // A plain string in AdminPanelService.DeleteProjectManagementUser(). Security-sensitive: removes a project role.
  DeleteProjectManagementUserUrl: 'api/AdminPanel/DeleteProjectManagementUser',

  // GlobalEndpoints.GetProcessDisconnectUsersUrl. Security-sensitive: it disconnects every signed-in
  // user at once. There's no way to disconnect just one person.
  GetProcessDisconnectUsersUrl: 'api/StowellAdmin/ProcessDisconnectUsers',
} as const;
