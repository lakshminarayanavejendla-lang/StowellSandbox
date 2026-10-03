// Matches DTO/ProjectRoles.cs. Like access-request.model.ts, nothing in the Contacts code uses it,
// so it's a model only, with no page or route.
export interface ProjectRole {
  id: number;
  roleId: number;
  roleName?: string | null;
  description?: string | null;
  isActive?: boolean | null;
  // A C# DateTime?, which arrives as an ISO date string.
  createdDate?: string | null;
}
