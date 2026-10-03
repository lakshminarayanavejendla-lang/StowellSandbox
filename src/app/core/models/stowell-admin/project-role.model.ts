// Matches DTO/ProjectRoles.cs. Returned by GetUserRoles() (api/AdminPanel/GetUserRoles) and fills
// the Role dropdown when adding an assignment in Project Access Management.
//
// Security: these are all the project roles that can be given out, such as Branch Manager and
// Project Manager. Giving one through InsertProjectManagementUser changes real access. The Blazor
// code never checks the admin's own permissions, so make sure the server only returns roles the
// signed-in admin is allowed to grant.
export interface ProjectRole {
  id: number;
  roleId: number;
  roleName?: string | null;
  description?: string | null;
  isActive?: boolean | null;
  createdDate?: string | null;
}
