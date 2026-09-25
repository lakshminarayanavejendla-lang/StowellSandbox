// Port of StowellCoApp.DTO.ProjectRoles (DTO/ProjectRoles.cs) - CONFIRMED read directly from
// source. Backs AdminPanelService.GetUserRoles() (api/AdminPanel/GetUserRoles) and populates the
// "Role" dropdown in the Project Access Management grid's add-assignment row.
//
// SECURITY-RELEVANT FLAG: this is the full list of assignable project roles (e.g. Branch
// Manager / Project Manager, per the dead demo markup in the old Index.razor). Assigning a role
// here via InsertProjectManagementUser is a real access-control action - confirm server-side that
// GetUserRoles only returns roles the *current* signed-in admin is permitted to grant, since
// nothing in the Blazor source inspects the caller's own permissions before populating or
// submitting this dropdown.
export interface ProjectRole {
  id: number;
  roleId: number;
  roleName?: string | null;
  description?: string | null;
  isActive?: boolean | null;
  createdDate?: string | null;
}
